/**
 * Database test suite — run with `npm run db:test`.
 *
 * These tests exist because the permission model is enforced entirely in the
 * database. The UI hiding a Delete button proves nothing; what matters is
 * that a Viewer's UPDATE is rejected by Postgres itself. Everything below
 * runs against a real Postgres with the real migrations applied.
 */
import assert from "node:assert/strict";

import { asUser, asUserCommitted, startHarness } from "./harness.mjs";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

/** Asserts that `fn` rejects, optionally matching the message or SQLSTATE. */
async function rejects(fn, { code, message } = {}) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, "expected the operation to be rejected, but it succeeded");
  if (code) assert.equal(error.code, code, `expected SQLSTATE ${code}, got ${error.code}: ${error.message}`);
  if (message) assert.match(error.message, message);
  return error;
}

/** RLS rejects a write two ways: a hard 42501, or silently matching no rows. */
const RLS_VIOLATION = "42501";
/** PL/pgSQL maps the `no_data_found` condition name to this SQLSTATE. */
const NO_DATA_FOUND = "P0002";

/**
 * The mutation RPCs return the row type (`public.events`), so `select * from
 * f(...)` expands it straight into columns — no composite-literal parsing.
 */
async function callReturningRow(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0];
}

async function main() {
  const log = (msg) => console.log(`  ${msg}`);
  console.log("\nBooting disposable postgres…");
  const { client, stop } = await startHarness({ log });

  // ---------------------------------------------------------------------
  // Fixtures. Created as service_role (RLS bypassed) because this is the
  // bootstrap path a real deployment uses too: the very first Super Admin
  // has to be granted by something that isn't already a Super Admin.
  // ---------------------------------------------------------------------
  const { rows: roleRows } = await client.query(`select id, name from public.roles`);
  const roleId = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

  const mkProfile = async (telegramId, firstName) => {
    const { rows } = await client.query(
      `select * from public.upsert_telegram_profile($1, $2, $3, null, null, 'uz', false)`,
      [telegramId, `user${telegramId}`, firstName],
    );
    return rows[0];
  };

  const admin = await mkProfile(1001, "Rustam");
  const viewer = await mkProfile(1002, "Dilnoza");
  const stranger = await mkProfile(1003, "Nobody");

  await client.query(`insert into public.user_roles (user_id, role_id) values ($1, $2)`, [
    admin.id,
    roleId.super_admin,
  ]);
  await client.query(`insert into public.user_roles (user_id, role_id) values ($1, $2)`, [viewer.id, roleId.viewer]);
  // `stranger` deliberately gets no role at all — a brand-new Telegram user.

  const { rows: typeRows } = await client.query(`select id, slug from public.gift_types`);
  const giftType = Object.fromEntries(typeRows.map((r) => [r.slug, r.id]));
  const { rows: currencyRows } = await client.query(`select id, code from public.currencies`);
  const currency = Object.fromEntries(currencyRows.map((r) => [r.code, r.id]));

  // A committed event + gift for read-path tests to look at.
  const seedEvent = await asUserCommitted(client, admin.id, async () => {
    const { rows } = await client.query(
      `select * from public.create_event('Erkinjon Wedding', 2024, null, 'Nilufar', 'Erkinjon', '2024-09-14', 'Andijon', null, 'active')`,
    );
    return rows[0];
  });

  await asUserCommitted(client, admin.id, async () => {
    await client.query(`select * from public.create_gift($1, 'Aziz Karimov', $2, 500000, $3)`, [
      seedEvent.id,
      giftType.cash,
      currency.UZS,
    ]);
    await client.query(`select * from public.create_gift($1, 'Bek Tursunov', $2, null, null, 120, 'kg')`, [
      seedEvent.id,
      giftType.cow,
    ]);
  });

  // =====================================================================
  // Permissions — the whole point of the schema
  // =====================================================================

  test("a user with no role granted sees nothing", async () => {
    await asUser(client, stranger.id, async () => {
      const { rows } = await client.query(`select * from public.events`);
      assert.equal(rows.length, 0, "a brand-new Telegram user must not see any ledger data");

      const { rows: gifts } = await client.query(`select * from public.gifts`);
      assert.equal(gifts.length, 0);
    });
  });

  test("an unauthenticated caller sees nothing", async () => {
    await asUser(client, null, async () => {
      const { rows } = await client.query(`select * from public.events`);
      assert.equal(rows.length, 0);
    });
  });

  test("a viewer can read active events and gifts", async () => {
    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.events`);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].title, "Erkinjon Wedding");

      const { rows: gifts } = await client.query(`select * from public.gifts`);
      assert.equal(gifts.length, 2);
    });
  });

  test("a viewer cannot create an event", async () => {
    await asUser(client, viewer.id, async () => {
      await rejects(() => client.query(`select public.create_event('Sneaky Wedding', 2025)`), {
        code: RLS_VIOLATION,
      });
    });
  });

  test("a viewer cannot update an event", async () => {
    await asUser(client, viewer.id, async () => {
      // The RLS USING clause hides the row from the UPDATE entirely, so the
      // statement matches nothing and the RPC reports not-found rather than
      // a privilege error. Either way the write does not happen.
      await rejects(
        () =>
          client.query(`select public.update_event($1, 'Hacked', 2024, null, null, null, null, null, null, 'active')`, [
            seedEvent.id,
          ]),
        { code: NO_DATA_FOUND },
      );
    });
  });

  test("a viewer cannot soft-delete an event or a gift", async () => {
    await asUser(client, viewer.id, async () => {
      await rejects(() => client.query(`select public.soft_delete_event($1)`, [seedEvent.id]), {
        code: NO_DATA_FOUND,
      });
    });
    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select id from public.gifts limit 1`);
      await rejects(() => client.query(`select public.soft_delete_gift($1)`, [rows[0].id]), { code: NO_DATA_FOUND });
    });
  });

  test("a viewer cannot insert directly into the tables, bypassing the RPCs", async () => {
    await asUser(client, viewer.id, async () => {
      await rejects(
        () =>
          client.query(`insert into public.events (title, event_year, created_by) values ('Direct', 2025, $1)`, [
            viewer.id,
          ]),
        { code: RLS_VIOLATION },
      );
    });
  });

  test("a viewer cannot grant themselves a role", async () => {
    await asUser(client, viewer.id, async () => {
      await rejects(
        () =>
          client.query(`insert into public.user_roles (user_id, role_id) values ($1, $2)`, [
            viewer.id,
            roleId.super_admin,
          ]),
        { code: RLS_VIOLATION },
      );
    });
  });

  test("a viewer cannot read audit logs", async () => {
    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.audit_logs`);
      assert.equal(rows.length, 0, "audit history is super-admin-only");
    });
  });

  test("a super admin has full CRUD", async () => {
    await asUser(client, admin.id, async () => {
      const created = await callReturningRow(client, `select * from public.create_event('Temp Wedding', 2025)`);
      const id = created.id;

      const { rows: updated } = await client.query(
        `select (public.update_event($1, 'Renamed', 2025, 'desc', null, null, null, 'Tashkent', null, 'active')).title as title`,
        [id],
      );
      assert.equal(updated[0].title, "Renamed");

      const { rows: archived } = await client.query(
        `select (public.set_event_status($1, 'archived')).status as status`,
        [id],
      );
      assert.equal(archived[0].status, "archived");

      const { rows: deleted } = await client.query(
        `select (public.soft_delete_event($1, 'test cleanup')).deleted_at as deleted_at`,
        [id],
      );
      assert.ok(deleted[0].deleted_at, "soft delete must stamp deleted_at");

      const { rows: restored } = await client.query(`select (public.restore_event($1)).deleted_at as deleted_at`, [id]);
      assert.equal(restored[0].deleted_at, null, "restore must clear deleted_at");
    });
  });

  // =====================================================================
  // Audit trail
  // =====================================================================

  test("creating an event writes an audit row carrying the request context", async () => {
    await asUser(client, admin.id, async () => {
      await client.query(
        `select public.create_event(
           'Audited Wedding', 2026, null, null, null, null, null, null, 'active',
           'because I said so', '203.0.113.9', 'TelegramBot/1.0', 'Safari', 'iOS'
         )`,
      );

      const { rows } = await client.query(
        `select * from public.audit_logs where table_name = 'events' order by created_at desc limit 1`,
      );
      const entry = rows[0];
      assert.equal(entry.action, "INSERT");
      assert.equal(entry.changed_by, admin.id);
      assert.equal(entry.telegram_user_id, "1001");
      assert.equal(entry.reason, "because I said so");
      assert.equal(entry.ip_address, "203.0.113.9");
      assert.equal(entry.browser, "Safari");
      assert.equal(entry.os, "iOS");
      assert.equal(entry.new_data.title, "Audited Wedding");
    });
  });

  test("a malformed ip in the request context does not abort the mutation", async () => {
    await asUser(client, admin.id, async () => {
      await client.query(
        `select public.create_event('Bad IP Wedding', 2026, null, null, null, null, null, null, 'active',
           null, 'not-an-ip-address', null, null, null)`,
      );
      const { rows } = await client.query(
        `select ip_address from public.audit_logs where new_data->>'title' = 'Bad IP Wedding'`,
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].ip_address, null, "an unparseable ip should be dropped, not fatal");
    });
  });

  test("soft delete and restore are logged as DELETE and RESTORE, not UPDATE", async () => {
    await asUser(client, admin.id, async () => {
      const created = await callReturningRow(client, `select * from public.create_event('Lifecycle', 2025)`);
      const id = created.id;

      await client.query(`select public.soft_delete_event($1)`, [id]);
      await client.query(`select public.restore_event($1)`, [id]);

      const { rows } = await client.query(
        `select action from public.audit_logs where record_id = $1 order by created_at`,
        [id],
      );
      assert.deepEqual(
        rows.map((r) => r.action),
        ["INSERT", "DELETE", "RESTORE"],
      );
    });
  });

  test("audit logs are immutable even for a super admin", async () => {
    await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select id from public.audit_logs limit 1`);
      await rejects(() => client.query(`update public.audit_logs set reason = 'tampered' where id = $1`, [rows[0].id]));
      await rejects(() => client.query(`delete from public.audit_logs where id = $1`, [rows[0].id]));
    });
  });

  test("audit logs are immutable even for a role that bypasses RLS", async () => {
    // service_role has BYPASSRLS, so the policies do not apply to it. The
    // trigger is what makes immutability real rather than a policy that the
    // platform's own admin key can walk straight through.
    const { rows } = await client.query(`select id from public.audit_logs limit 1`);
    await rejects(() => client.query(`update public.audit_logs set reason = 'tampered' where id = $1`, [rows[0].id]), {
      message: /immutable/,
    });
  });

  test("audit logs cannot be inserted directly", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(
        () =>
          client.query(
            `insert into public.audit_logs (table_name, record_id, action) values ('events', $1, 'INSERT')`,
            [seedEvent.id],
          ),
        { code: RLS_VIOLATION },
      );
    });
  });

  // =====================================================================
  // Type-driven gift validation
  // =====================================================================

  test("a cash gift without an amount is rejected", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(
        () => client.query(`select public.create_gift($1, 'No Amount', $2)`, [seedEvent.id, giftType.cash]),
        { message: /requires an amount/ },
      );
    });
  });

  test("a cash gift without a currency is rejected", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(
        () => client.query(`select public.create_gift($1, 'No Currency', $2, 1000)`, [seedEvent.id, giftType.cash]),
        // The amount/currency CHECK constraint catches this before the
        // trigger does; either way it cannot be stored.
        {},
      );
    });
  });

  test("a livestock gift without a weight is rejected", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(
        () => client.query(`select public.create_gift($1, 'No Weight', $2)`, [seedEvent.id, giftType.cow]),
        { message: /requires a weight/ },
      );
    });
  });

  test("a gift type with no requirements accepts a bare record", async () => {
    await asUser(client, admin.id, async () => {
      const { rows } = await client.query(
        `select (public.create_gift($1, 'Anon Giver', $2, null, null, null, null, 'A blender')).giver_name as name`,
        [seedEvent.id, giftType.other],
      );
      assert.equal(rows[0].name, "Anon Giver");
    });
  });

  test("an amount without a currency is rejected by the check constraint", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(() =>
        client.query(
          `insert into public.gifts (event_id, giver_name, gift_type_id, amount, created_by)
           values ($1, 'Broken', $2, 100, $3)`,
          [seedEvent.id, giftType.other, admin.id],
        ),
      );
    });
  });

  // =====================================================================
  // created_by / updated_by cannot be spoofed
  // =====================================================================

  test("create_event pins created_by to the caller regardless of intent", async () => {
    await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select (public.create_event('Attribution', 2025)).created_by as created_by`);
      assert.equal(rows[0].created_by, admin.id);
    });
  });

  test("a super admin cannot forge created_by on a direct insert", async () => {
    await asUser(client, admin.id, async () => {
      await rejects(
        () =>
          client.query(`insert into public.events (title, event_year, created_by) values ('Forged', 2025, $1)`, [
            viewer.id,
          ]),
        { code: RLS_VIOLATION },
      );
    });
  });

  // =====================================================================
  // Gift visibility derives from event visibility
  // =====================================================================

  test("deleting an event hides its gifts from a viewer", async () => {
    const temp = await asUserCommitted(client, admin.id, async () => {
      const created = await callReturningRow(client, `select * from public.create_event('Doomed Wedding', 2025)`);
      await client.query(`select public.create_gift($1, 'Ghost Giver', $2, 100, $3)`, [
        created.id,
        giftType.cash,
        currency.USD,
      ]);
      return created.id;
    });

    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.gifts where giver_name = 'Ghost Giver'`);
      assert.equal(rows.length, 1, "sanity: visible while the event is alive");
    });

    await asUserCommitted(client, admin.id, async () => {
      await client.query(`select public.soft_delete_event($1)`, [temp]);
    });

    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.gifts where giver_name = 'Ghost Giver'`);
      assert.equal(rows.length, 0, "a deleted event's gifts must not stay independently readable");
    });

    // …and restoring the event brings exactly those gifts back, with no
    // cascade bookkeeping involved.
    await asUserCommitted(client, admin.id, async () => {
      await client.query(`select public.restore_event($1)`, [temp]);
    });

    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.gifts where giver_name = 'Ghost Giver'`);
      assert.equal(rows.length, 1, "restore must make the gifts readable again");
    });

    await asUserCommitted(client, admin.id, async () => {
      await client.query(`select public.soft_delete_event($1)`, [temp]);
    });
  });

  test("a super admin cannot add a gift to a deleted event", async () => {
    const temp = await asUserCommitted(client, admin.id, async () => {
      const created = await callReturningRow(client, `select * from public.create_event('Inert Wedding', 2025)`);
      await client.query(`select public.soft_delete_event($1)`, [created.id]);
      return created.id;
    });

    await asUser(client, admin.id, async () => {
      await rejects(
        () =>
          client.query(`select public.create_gift($1, 'Too Late', $2, 100, $3)`, [temp, giftType.cash, currency.USD]),
        { code: RLS_VIOLATION },
      );
    });
  });

  test("dashboard totals ignore gifts belonging to deleted events", async () => {
    const before = await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select * from public.dashboard_stats`);
      return rows[0];
    });

    const temp = await asUserCommitted(client, admin.id, async () => {
      const created = await callReturningRow(client, `select * from public.create_event('Excluded Wedding', 2025)`);
      await client.query(`select public.create_gift($1, 'Excluded Giver', $2, 999, $3)`, [
        created.id,
        giftType.cash,
        currency.EUR,
      ]);
      await client.query(`select public.soft_delete_event($1)`, [created.id]);
      return created.id;
    });

    const after = await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select * from public.dashboard_stats`);
      return rows[0];
    });

    assert.equal(after.total_gifts, before.total_gifts, "a deleted event's gift must not count");
    assert.equal(after.total_events, before.total_events, "a deleted event must not count");

    const eur = (after.cash_totals ?? []).find((t) => t.currency_code === "EUR");
    assert.ok(!eur || Number(eur.total_amount) !== 999, "the excluded gift must not reach the cash totals");

    await client.query(`delete from public.gifts where event_id = $1`, [temp]);
  });

  test("dashboard cash totals stay separated per currency", async () => {
    await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select * from public.dashboard_stats`);
      const totals = rows[0].cash_totals ?? [];
      const codes = totals.map((t) => t.currency_code);
      assert.deepEqual([...codes].sort(), [...new Set(codes)].sort(), "each currency appears exactly once");
      assert.ok(
        totals.every((t) => typeof t.currency_code === "string"),
        "every total is labelled with its currency — there is no blended number",
      );
    });
  });

  test("event_summaries reports the same gift count to a viewer and a super admin", async () => {
    // Includes a soft-deleted gift, which a super admin *can* read directly —
    // the count still has to agree, or the two roles are looking at different
    // facts about the same wedding.
    await asUserCommitted(client, admin.id, async () => {
      const { rows } = await client.query(`select (public.create_gift($1, 'Will Be Deleted', $2, 5, $3)).id as id`, [
        seedEvent.id,
        giftType.cash,
        currency.USD,
      ]);
      await client.query(`select public.soft_delete_gift($1)`, [rows[0].id]);
    });

    const adminCount = await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select gift_count from public.event_summaries where id = $1`, [
        seedEvent.id,
      ]);
      return rows[0].gift_count;
    });

    const viewerCount = await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select gift_count from public.event_summaries where id = $1`, [
        seedEvent.id,
      ]);
      return rows[0].gift_count;
    });

    assert.equal(adminCount, viewerCount, "gift_count must not depend on who is asking");
  });

  // =====================================================================
  // my_permissions — the frontend's only source of truth about roles
  // =====================================================================

  test("my_permissions reports a super admin correctly", async () => {
    await asUser(client, admin.id, async () => {
      const { rows } = await client.query(`select * from public.my_permissions()`);
      assert.equal(rows[0].is_super_admin, true);
      assert.equal(rows[0].is_viewer_or_above, true);
      assert.deepEqual(rows[0].roles, ["super_admin"]);
    });
  });

  test("my_permissions reports a viewer correctly", async () => {
    await asUser(client, viewer.id, async () => {
      const { rows } = await client.query(`select * from public.my_permissions()`);
      assert.equal(rows[0].is_super_admin, false);
      assert.equal(rows[0].is_viewer_or_above, true);
      assert.deepEqual(rows[0].roles, ["viewer"]);
    });
  });

  test("my_permissions answers for a roleless user instead of erroring", async () => {
    // This user cannot SELECT public.roles at all, so a security-invoker
    // version of this function would throw rather than return false — and the
    // app would show an error page instead of "you don't have access yet".
    await asUser(client, stranger.id, async () => {
      const { rows } = await client.query(`select * from public.my_permissions()`);
      assert.equal(rows[0].is_super_admin, false);
      assert.equal(rows[0].is_viewer_or_above, false);
      assert.deepEqual(rows[0].roles, []);
    });
  });

  test("my_permissions follows a revoked role", async () => {
    const temp = await mkProfile(1004, "Temporary");
    await client.query(`insert into public.user_roles (user_id, role_id) values ($1, $2)`, [temp.id, roleId.viewer]);

    const granted = await asUser(client, temp.id, async () => {
      const { rows } = await client.query(`select * from public.my_permissions()`);
      return rows[0].is_viewer_or_above;
    });
    assert.equal(granted, true);

    await client.query(`update public.user_roles set deleted_at = now() where user_id = $1`, [temp.id]);

    const revoked = await asUser(client, temp.id, async () => {
      const { rows } = await client.query(`select * from public.my_permissions()`);
      return rows[0].is_viewer_or_above;
    });
    assert.equal(revoked, false, "revoking a grant must take effect immediately, not at cookie expiry");
  });

  // =====================================================================
  // Platform wiring
  // =====================================================================

  test("realtime publishes events, gifts and audit_logs", async () => {
    const { rows } = await client.query(
      `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'`,
    );
    const published = rows.map((r) => r.tablename).sort();
    assert.deepEqual(published, ["audit_logs", "events", "gifts"]);
  });

  test("all four storage buckets exist and are private", async () => {
    const { rows } = await client.query(`select id, public from storage.buckets order by id`);
    assert.deepEqual(
      rows.map((r) => r.id),
      ["attachments", "avatars", "covers", "future-gallery"],
    );
    assert.ok(
      rows.every((r) => r.public === false),
      "no bucket may be public — every read goes through a signed URL",
    );
  });

  test("future-gallery has no storage policies yet (default deny)", async () => {
    const { rows } = await client.query(
      `select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'`,
    );
    const mentionsGallery = rows.some((r) => /gallery/i.test(r.policyname));
    assert.equal(mentionsGallery, false, "the reserved bucket must stay default-deny until its feature is designed");
  });

  test("every public table has RLS enabled", async () => {
    const { rows } = await client.query(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `);
    assert.deepEqual(
      rows.map((r) => r.relname),
      [],
      "a public table without RLS is readable by anyone with the anon key",
    );
  });

  test("no view leaks past RLS via security_definer", async () => {
    // A Postgres view defaults to the *owner's* privileges for RLS. Any view
    // here that is not security_invoker would silently expose the whole table.
    const { rows } = await client.query(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'v'
        and not coalesce((
          select option_value::boolean
          from pg_options_to_table(c.reloptions)
          where option_name = 'security_invoker'
        ), false)
    `);
    assert.deepEqual(
      rows.map((r) => r.relname),
      [],
      "every view must be security_invoker so RLS is re-checked as the caller",
    );
  });

  // =====================================================================
  // Run
  // =====================================================================
  console.log(`\nRunning ${tests.length} database tests\n`);
  let passed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  [32m✓[0m ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`  [31m✗[0m ${name}`);
      console.log(`      ${error.message.split("\n")[0]}`);
      failures.push({ name, error });
    }
  }

  console.log(`\n  ${passed}/${tests.length} passed\n`);

  if (failures.length) {
    console.log("Failures:\n");
    for (const { name, error } of failures) {
      console.log(`  ${name}\n    ${error.stack?.split("\n").slice(0, 4).join("\n    ")}\n`);
    }
  }

  await stop();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error("\nHarness failed to start:\n", error);
  process.exit(1);
});
