-- create or replace function fake_test_pass() returns trigger as $$
-- declare
-- begin
--   if NEW.body = 'fake pass body' then
--     raise 'Cannot send message - frequently unsubscribed recipient';
--   end if;

--   return NEW;
-- end;
-- $$ language plpgsql;

-- create trigger fake_test_pass
--   before insert
--   on outbound_messages
--   for each row
--   execute procedure fake_test_pass();
