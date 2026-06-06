

create extension if not exists "uuid-ossp";
create extension if not exists postgis;          
create extension if not exists pg_trgm;          

create type user_role as enum ('tourist', 'guide', 'admin');
create type kyc_status as enum ('not_submitted', 'pending', 'approved', 'rejected', 'resubmit');
create type booking_status as enum ('requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
create type payment_status as enum ('pending', 'held', 'released', 'refunded', 'failed');
create type trip_category as enum ('trekking', 'cultural', 'adventure', 'wildlife', 'spiritual', 'sightseeing', 'food', 'photography');
create type document_type as enum ('citizenship', 'passport', 'driving_license', 'guide_license', 'selfie');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'tourist',
  full_name text not null,
  phone text unique,
  email text unique,
  avatar_url text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  preferred_language text default 'en' check (preferred_language in ('en', 'ne')),
  country text,                                  
  bio text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_phone on public.profiles(phone);

create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status kyc_status not null default 'not_submitted',
  
  full_name_legal text not null,
  citizenship_number text,
  passport_number text,
  date_of_birth date not null,
  permanent_address text not null,
  current_address text,
  
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,
  resubmission_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index idx_kyc_status on public.kyc_verifications(status);
create index idx_kyc_user on public.kyc_verifications(user_id);

create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  kyc_id uuid not null references public.kyc_verifications(id) on delete cascade,
  document_type document_type not null,
  file_url text not null,                        
  file_size_bytes int,
  mime_type text,
  uploaded_at timestamptz default now()
);

create index idx_kyc_docs_kyc on public.kyc_documents(kyc_id);

create table public.guide_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  
  years_of_experience int default 0,
  guide_license_number text unique,              
  license_expiry_date date,
  
  bio_long text,                                 
  languages_spoken text[] default '{english}',   
  specializations trip_category[] default '{sightseeing}',
  service_areas text[] default '{}',             
  
  price_per_hour numeric(10,2),
  price_per_day numeric(10,2),
  price_per_trek_day numeric(10,2),              
  min_booking_hours int default 2,
  
  is_online boolean default false,               
  is_verified boolean default false,             
  current_lat double precision,                  
  current_lng double precision,
  last_location_update timestamptz,
  
  total_trips_completed int default 0,
  average_rating numeric(3,2) default 0,
  total_reviews int default 0,
  total_earnings numeric(12,2) default 0,
  response_time_minutes int,                     
  acceptance_rate numeric(5,2),                  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_guide_online on public.guide_profiles(is_online) where is_online = true;
create index idx_guide_verified on public.guide_profiles(is_verified);
create index idx_guide_areas on public.guide_profiles using gin(service_areas);
create index idx_guide_languages on public.guide_profiles using gin(languages_spoken);
create index idx_guide_location on public.guide_profiles(current_lat, current_lng);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  short_description text,
  district text not null,                        
  province text,
  category trip_category[] default '{sightseeing}',
  
  latitude double precision not null,
  longitude double precision not null,
  altitude_m int,
  
  cover_image_url text,
  gallery_urls text[],
  
  best_season text[],                            
  difficulty_level text check (difficulty_level in ('easy','moderate','hard','expert')),
  estimated_duration_hours int,
  entry_fee_npr numeric(10,2),
  
  tags text[],
  is_featured boolean default false,
  is_active boolean default true,
  view_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_dest_district on public.destinations(district);
create index idx_dest_featured on public.destinations(is_featured) where is_featured = true;
create index idx_dest_category on public.destinations using gin(category);
create index idx_dest_tags on public.destinations using gin(tags);
create index idx_dest_search on public.destinations using gin(name gin_trgm_ops);
create index idx_dest_location on public.destinations(latitude, longitude);

create table public.saved_destinations (
  user_id uuid references public.profiles(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete cascade,
  saved_at timestamptz default now(),
  primary key (user_id, destination_id)
);

create table public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  
  start_date date,
  end_date date,
  total_days int not null,
  budget_npr numeric(12,2),
  travelers_count int default 1,
  trip_categories trip_category[] default '{sightseeing}',
  preferred_districts text[],
  special_requests text,                         
  
  itinerary jsonb not null default '[]',         
  estimated_total_cost_npr numeric(12,2),
  ai_model text default 'claude-3-5-sonnet',
  ai_generated_at timestamptz default now(),
  
  is_saved boolean default true,
  is_shared boolean default false,
  share_token text unique,                       
  
  booked_guide_id uuid references public.guide_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_trip_plans_user on public.trip_plans(user_id);
create index idx_trip_plans_share on public.trip_plans(share_token) where share_token is not null;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  
  tourist_id uuid not null references public.profiles(id) on delete restrict,
  guide_id uuid not null references public.guide_profiles(id) on delete restrict,
  
  trip_plan_id uuid references public.trip_plans(id),
  start_date date not null,
  end_date date not null,
  start_time time,
  pickup_location text,
  pickup_lat double precision,
  pickup_lng double precision,
  destinations uuid[],                           
  travelers_count int default 1,
  special_notes text,
  
  hourly_rate_npr numeric(10,2),
  daily_rate_npr numeric(10,2),
  total_hours numeric(6,2),
  total_days int,
  subtotal_npr numeric(12,2) not null,
  service_fee_npr numeric(10,2) default 0,       
  total_amount_npr numeric(12,2) not null,
  
  status booking_status not null default 'requested',
  requested_at timestamptz default now(),
  responded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by uuid references public.profiles(id),
  
  payment_status payment_status default 'pending',
  payment_method text,                           
  payment_transaction_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_bookings_tourist on public.bookings(tourist_id);
create index idx_bookings_guide on public.bookings(guide_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_dates on public.bookings(start_date, end_date);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  
  punctuality_rating int check (punctuality_rating between 1 and 5),
  knowledge_rating int check (knowledge_rating between 1 and 5),
  friendliness_rating int check (friendliness_rating between 1 and 5),
  value_rating int check (value_rating between 1 and 5),
  is_visible boolean default true,
  created_at timestamptz default now(),
  unique(booking_id, reviewer_id)
);

create index idx_reviews_reviewee on public.reviews(reviewee_id);
create index idx_reviews_booking on public.reviews(booking_id);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  tourist_id uuid not null references public.profiles(id) on delete cascade,
  guide_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_chat_threads_tourist on public.chat_threads(tourist_id);
create index idx_chat_threads_guide on public.chat_threads(guide_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  attachment_url text,
  message_type text default 'text' check (message_type in ('text','image','location','system')),
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_chat_messages_thread on public.chat_messages(thread_id, created_at desc);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_npr numeric(12,2) not null,
  type text not null check (type in ('payment','refund','payout','platform_fee')),
  status payment_status not null default 'pending',
  gateway text,                                  
  gateway_transaction_id text,
  gateway_response jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_txn_booking on public.transactions(booking_id);
create index idx_txn_user on public.transactions(user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text,                                     
  data jsonb,                                    
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notif_user on public.notifications(user_id, created_at desc);
create index idx_notif_unread on public.notifications(user_id) where is_read = false;

create table public.push_tokens (
  user_id uuid references public.profiles(id) on delete cascade,
  token text not null,
  device_type text,                              
  created_at timestamptz default now(),
  primary key (user_id, token)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'tourist')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_kyc before update on public.kyc_verifications for each row execute function public.set_updated_at();
create trigger set_updated_at_guide before update on public.guide_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_dest before update on public.destinations for each row execute function public.set_updated_at();
create trigger set_updated_at_trip before update on public.trip_plans for each row execute function public.set_updated_at();
create trigger set_updated_at_booking before update on public.bookings for each row execute function public.set_updated_at();

create or replace function public.recalc_guide_rating()
returns trigger language plpgsql as $$
declare
  guide_user_id uuid;
begin
  guide_user_id := coalesce(new.reviewee_id, old.reviewee_id);

  update public.guide_profiles gp
  set average_rating = coalesce((
        select round(avg(rating)::numeric, 2)
        from public.reviews
        where reviewee_id = guide_user_id and is_visible = true
      ), 0),
      total_reviews = (
        select count(*) from public.reviews
        where reviewee_id = guide_user_id and is_visible = true
      )
  where gp.id = guide_user_id;
  return null;
end;
$$;

create trigger recalc_guide_rating_trg
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_guide_rating();

alter table public.profiles enable row level security;
alter table public.kyc_verifications enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.guide_profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.saved_destinations enable row level security;
alter table public.trip_plans enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "Profiles are viewable by everyone"   on public.profiles for select using (true);
create policy "Users can update own profile"        on public.profiles for update using (auth.uid() = id);

create policy "Users view own KYC"                  on public.kyc_verifications for select using (auth.uid() = user_id);
create policy "Users insert own KYC"                on public.kyc_verifications for insert with check (auth.uid() = user_id);
create policy "Users update own KYC"                on public.kyc_verifications for update using (auth.uid() = user_id);
create policy "Users view own KYC docs"             on public.kyc_documents for select
  using (exists (select 1 from public.kyc_verifications where id = kyc_id and user_id = auth.uid()));
create policy "Users insert own KYC docs"           on public.kyc_documents for insert
  with check (exists (select 1 from public.kyc_verifications where id = kyc_id and user_id = auth.uid()));

create policy "Verified guides visible to all"      on public.guide_profiles for select using (is_verified = true or auth.uid() = id);
create policy "Guides update own profile"           on public.guide_profiles for update using (auth.uid() = id);
create policy "Guides insert own profile"           on public.guide_profiles for insert with check (auth.uid() = id);

create policy "Destinations viewable by all"        on public.destinations for select using (is_active = true);

create policy "Users manage own favorites"          on public.saved_destinations for all using (auth.uid() = user_id);

create policy "Users view own trip plans"           on public.trip_plans for select
  using (auth.uid() = user_id or is_shared = true);
create policy "Users manage own trip plans"         on public.trip_plans for all using (auth.uid() = user_id);

create policy "Booking parties can view"            on public.bookings for select
  using (auth.uid() = tourist_id or auth.uid() = guide_id);
create policy "Tourists create bookings"            on public.bookings for insert with check (auth.uid() = tourist_id);
create policy "Parties can update bookings"         on public.bookings for update
  using (auth.uid() = tourist_id or auth.uid() = guide_id);

create policy "Reviews publicly viewable"           on public.reviews for select using (is_visible = true);
create policy "Users review own bookings"           on public.reviews for insert with check (auth.uid() = reviewer_id);

create policy "Chat threads visible to parties"     on public.chat_threads for select
  using (auth.uid() = tourist_id or auth.uid() = guide_id);
create policy "Messages visible in own threads"     on public.chat_messages for select
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and (t.tourist_id = auth.uid() or t.guide_id = auth.uid())));
create policy "Send messages in own threads"        on public.chat_messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.chat_threads t where t.id = thread_id and (t.tourist_id = auth.uid() or t.guide_id = auth.uid())
  )
);

create policy "Users view own transactions"         on public.transactions for select using (auth.uid() = user_id);

create policy "Users view own notifications"       on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"     on public.notifications for update using (auth.uid() = user_id);

create policy "Users manage own push tokens"        on public.push_tokens for all using (auth.uid() = user_id);

insert into public.destinations (name, slug, description, district, province, category, latitude, longitude, altitude_m, difficulty_level, is_featured, tags) values
('Pashupatinath Temple', 'pashupatinath-temple', 'Sacred Hindu temple complex on the banks of the Bagmati River, UNESCO World Heritage Site.', 'Kathmandu', 'Bagmati', '{spiritual,cultural}', 27.7106, 85.3487, 1400, 'easy', true, '{unesco,hindu,heritage}'),
('Boudhanath Stupa', 'boudhanath-stupa', 'One of the largest spherical stupas in Nepal, a UNESCO World Heritage Site.', 'Kathmandu', 'Bagmati', '{spiritual,cultural}', 27.7215, 85.3620, 1400, 'easy', true, '{unesco,buddhist,heritage}'),
('Everest Base Camp', 'everest-base-camp', 'The legendary trek to the foot of the worlds tallest mountain.', 'Solukhumbu', 'Koshi', '{trekking,adventure}', 28.0026, 86.8528, 5364, 'expert', true, '{everest,himalaya,trek}'),
('Pokhara Lakeside', 'pokhara-lakeside', 'Scenic lakeside town with views of the Annapurna range.', 'Kaski', 'Gandaki', '{sightseeing,adventure}', 28.2096, 83.9856, 822, 'easy', true, '{lake,annapurna,paragliding}'),
('Chitwan National Park', 'chitwan-national-park', 'Wildlife safari in Nepals premier national park, home to rhinos and tigers.', 'Chitwan', 'Bagmati', '{wildlife,adventure}', 27.5291, 84.3542, 150, 'easy', true, '{safari,rhino,unesco}'),
('Lumbini', 'lumbini', 'The birthplace of Lord Buddha, UNESCO World Heritage Site.', 'Rupandehi', 'Lumbini', '{spiritual,cultural}', 27.4833, 83.2767, 150, 'easy', true, '{buddha,unesco,pilgrimage}'),
('Annapurna Circuit', 'annapurna-circuit', 'Classic high-altitude trek through diverse landscapes.', 'Manang', 'Gandaki', '{trekking,adventure}', 28.6667, 84.0167, 5416, 'hard', true, '{annapurna,thorong-la,trek}'),
('Bhaktapur Durbar Square', 'bhaktapur-durbar-square', 'Medieval city of artisans, UNESCO World Heritage Site.', 'Bhaktapur', 'Bagmati', '{cultural,sightseeing}', 27.6710, 85.4298, 1401, 'easy', true, '{unesco,heritage,newari}');

