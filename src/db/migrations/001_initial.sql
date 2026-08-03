CREATE TABLE guild_configs (
  guild_id TEXT PRIMARY KEY,
  branch TEXT NOT NULL DEFAULT 'army' CHECK (
    branch IN ('army', 'marine_corps', 'navy', 'air_force', 'space_force', 'coast_guard')
  ),
  organization_name TEXT NOT NULL DEFAULT 'United States Army',
  staff_role_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_role_id TEXT,
  log_channel_id TEXT,
  nickname_format TEXT NOT NULL DEFAULT '[{rank}] {roblox}',
  roblox_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  roblox_group_id BIGINT,
  roblox_min_rank INTEGER NOT NULL DEFAULT 1 CHECK (roblox_min_rank BETWEEN 0 AND 255),
  roblox_auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roblox_links (
  discord_user_id TEXT PRIMARY KEY,
  roblox_user_id BIGINT NOT NULL UNIQUE,
  roblox_username TEXT NOT NULL,
  verification_method TEXT NOT NULL DEFAULT 'profile_challenge',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE personnel (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'army' CHECK (
    branch IN ('army', 'marine_corps', 'navy', 'air_force', 'space_force', 'coast_guard')
  ),
  rank_code TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  rank_paygrade TEXT NOT NULL,
  unit TEXT,
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'reserve', 'loa', 'retired', 'discharged')
  ),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  roblox_group_rank INTEGER,
  roblox_group_role TEXT,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, discord_user_id)
);

CREATE TABLE verification_challenges (
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  roblox_user_id BIGINT NOT NULL,
  roblox_username TEXT NOT NULL,
  challenge_code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, discord_user_id)
);

CREATE TABLE rank_binds (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  roblox_group_rank INTEGER NOT NULL CHECK (roblox_group_rank BETWEEN 0 AND 255),
  branch_rank_code TEXT NOT NULL,
  discord_role_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, roblox_group_rank)
);

CREATE TABLE service_records (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (
    record_type IN (
      'enlistment', 'promotion', 'demotion', 'training', 'award',
      'discipline', 'status_change', 'verification', 'note', 'discharge'
    )
  ),
  title TEXT NOT NULL,
  details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loa_requests (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'denied', 'cancelled')
  ),
  decided_by TEXT,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  CHECK (ends_on >= starts_on)
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guild_configs(guild_id) ON DELETE CASCADE,
  actor_discord_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX personnel_guild_status_idx ON personnel(guild_id, status);
CREATE INDEX personnel_guild_rank_idx ON personnel(guild_id, rank_paygrade);
CREATE INDEX service_records_member_idx ON service_records(guild_id, discord_user_id, created_at DESC);
CREATE INDEX loa_requests_guild_status_idx ON loa_requests(guild_id, status, created_at DESC);
CREATE INDEX audit_logs_guild_created_idx ON audit_logs(guild_id, created_at DESC);
CREATE INDEX verification_challenges_expiry_idx ON verification_challenges(expires_at);
CREATE INDEX user_sessions_expire_idx ON user_sessions(expire);

CREATE OR REPLACE FUNCTION kronos_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guild_configs_updated_at
BEFORE UPDATE ON guild_configs
FOR EACH ROW EXECUTE FUNCTION kronos_set_updated_at();

CREATE TRIGGER roblox_links_updated_at
BEFORE UPDATE ON roblox_links
FOR EACH ROW EXECUTE FUNCTION kronos_set_updated_at();

CREATE TRIGGER personnel_updated_at
BEFORE UPDATE ON personnel
FOR EACH ROW EXECUTE FUNCTION kronos_set_updated_at();

CREATE TRIGGER rank_binds_updated_at
BEFORE UPDATE ON rank_binds
FOR EACH ROW EXECUTE FUNCTION kronos_set_updated_at();

