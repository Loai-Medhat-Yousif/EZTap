-- Generates a random 6-digit card_id (100000-999999, so the first digit
-- is never 0) that isn't already in use.
--
-- This check-then-return is the right shape for a low-concurrency,
-- single-admin tool, but it is NOT by itself a hard collision guarantee
-- under concurrent inserts — there's a window between this function
-- returning a candidate and the caller's INSERT committing. The actual
-- guarantee comes from the UNIQUE constraint on cards.card_id: the
-- Stage 5 "create card" Server Action must call this function, attempt
-- the insert, and retry (call again + re-insert) specifically on a
-- unique_violation. That combination — optimistic candidate generation
-- here, hard uniqueness enforced by the constraint, retry in the
-- application layer — is what makes the overall flow collision-safe.
create or replace function generate_unique_card_id()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
  max_attempts constant int := 50;
begin
  loop
    candidate := (floor(random() * 900000) + 100000)::int::text;

    exit when not exists (
      select 1 from cards where card_id = candidate
    );

    attempts := attempts + 1;
    if attempts >= max_attempts then
      raise exception
        'generate_unique_card_id: no free card_id found after % attempts',
        max_attempts;
    end if;
  end loop;

  return candidate;
end;
$$;

-- Admin-only: this is an implementation detail of the card-creation
-- flow, not something that needs to be callable anonymously.
revoke all on function generate_unique_card_id() from public;
grant execute on function generate_unique_card_id() to authenticated;
