-- Vulcatic 1.3.1: owners need a phone number, and important edits go back to the admin.
-- Replaces one function. Changes no rows.
create or replace function public.guard_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;  -- SQL editor
  if public.is_admin() then
    if tg_op = 'INSERT' then new.approved = true; end if;
    return new;
  end if;
  if length(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g')) < 7 then
    raise exception 'Please enter a phone number customers can call.';
  end if;
  if tg_op = 'INSERT' then
    new.owner_id = auth.uid();
    new.created_by = auth.uid();
    new.approved = false;
    new.is_demo = false;
  else
    new.owner_id = old.owner_id;
    new.created_by = old.created_by;
    new.created_at = old.created_at;
    new.is_demo = old.is_demo;
    new.kind = old.kind;
    -- Hours, status and a Vulcator's location change every day, so they need no new check.
    new.approved = old.approved
      and (new.name, new.phone, new.address, new.description)
          is not distinct from (old.name, old.phone, old.address, old.description)
      and (old.kind = 'vulcator' or (new.lat, new.lng) is not distinct from (old.lat, old.lng));
  end if;
  return new;
end;
$$;
