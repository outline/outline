CREATE OR REPLACE FUNCTION enforce_pet_store_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	current_plan text;
	plan_limit integer;
	current_usage integer;
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id::text, 0));

	SELECT CASE
		WHEN status = 'active'
			AND (current_period_end IS NULL OR current_period_end > now())
		THEN plan::text
		ELSE 'free'
	END
	INTO current_plan
	FROM subscriptions
	WHERE business_id = NEW.business_id;

	current_plan := COALESCE(current_plan, 'free');

	IF TG_TABLE_NAME = 'branches' THEN
		IF NOT NEW.is_active THEN
			RETURN NEW;
		END IF;
		plan_limit := CASE current_plan
			WHEN 'business' THEN 20
			WHEN 'pro' THEN 3
			ELSE 1
		END;
		SELECT count(*) INTO current_usage
		FROM branches
		WHERE business_id = NEW.business_id
			AND is_active = true
			AND (TG_OP = 'INSERT' OR id <> NEW.id);
	ELSIF TG_TABLE_NAME = 'user_roles' THEN
		IF EXISTS (
			SELECT 1 FROM user_roles
			WHERE business_id = NEW.business_id AND user_id = NEW.user_id
		) THEN
			RETURN NEW;
		END IF;
		plan_limit := CASE current_plan
			WHEN 'business' THEN 50
			WHEN 'pro' THEN 10
			ELSE 3
		END;
		SELECT count(DISTINCT ur.user_id) INTO current_usage
		FROM user_roles ur
		JOIN profiles p
			ON p.business_id = ur.business_id
			AND p.user_id = ur.user_id
			AND p.is_active = true
		WHERE ur.business_id = NEW.business_id;
	ELSIF TG_TABLE_NAME = 'profiles' THEN
		IF NOT NEW.is_active THEN
			RETURN NEW;
		END IF;
		plan_limit := CASE current_plan
			WHEN 'business' THEN 50
			WHEN 'pro' THEN 10
			ELSE 3
		END;
		SELECT count(DISTINCT p.user_id) INTO current_usage
		FROM profiles p
		WHERE p.business_id = NEW.business_id
			AND p.is_active = true
			AND p.id <> NEW.id
			AND EXISTS (
				SELECT 1 FROM user_roles ur
				WHERE ur.business_id = p.business_id
					AND ur.user_id = p.user_id
			);
	ELSIF TG_TABLE_NAME = 'boardings' THEN
		plan_limit := CASE current_plan
			WHEN 'business' THEN 2000
			WHEN 'pro' THEN 200
			ELSE 30
		END;
		SELECT count(*) INTO current_usage
		FROM boardings
		WHERE business_id = NEW.business_id
			AND created_at >= date_trunc('month', now())
			AND created_at < date_trunc('month', now()) + interval '1 month';
	ELSE
		RETURN NEW;
	END IF;

	IF current_usage >= plan_limit THEN
		RAISE EXCEPTION 'subscription plan limit exceeded for % (%/%)',
			TG_TABLE_NAME, current_usage, plan_limit
			USING ERRCODE = 'P0001';
	END IF;

	RETURN NEW;
END;
$$;

CREATE TRIGGER branches_enforce_plan_limit
BEFORE INSERT OR UPDATE OF is_active ON branches
FOR EACH ROW EXECUTE FUNCTION enforce_pet_store_plan_limit();

CREATE TRIGGER user_roles_enforce_plan_limit
BEFORE INSERT ON user_roles
FOR EACH ROW EXECUTE FUNCTION enforce_pet_store_plan_limit();

CREATE TRIGGER profiles_enforce_plan_limit
BEFORE INSERT OR UPDATE OF is_active ON profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_pet_store_plan_limit();

CREATE TRIGGER boardings_enforce_plan_limit
BEFORE INSERT ON boardings
FOR EACH ROW EXECUTE FUNCTION enforce_pet_store_plan_limit();
