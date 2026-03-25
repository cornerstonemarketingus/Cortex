-- Lead score trigger helpers for PostgreSQL.
-- Apply manually to CRM database after provisioning.

CREATE OR REPLACE FUNCTION crm_recalculate_lead_score(p_lead_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  inbound_replies INT := 0;
  click_events INT := 0;
  booking_events INT := 0;
  completed_appointments INT := 0;
  proposal_events INT := 0;
  has_email BOOLEAN := FALSE;
  has_phone BOOLEAN := FALSE;
  computed_score INT := 0;
BEGIN
  SELECT COUNT(*) INTO inbound_replies
  FROM "ConversationMessage" cm
  JOIN "Conversation" c ON c.id = cm."conversationId"
  WHERE c."leadId" = p_lead_id AND cm.direction = 'INBOUND';

  SELECT COUNT(*) INTO click_events
  FROM "Interaction"
  WHERE "leadId" = p_lead_id AND type = 'link_clicked';

  SELECT COUNT(*) INTO booking_events
  FROM "Interaction"
  WHERE "leadId" = p_lead_id AND type = 'appointment_booked';

  SELECT COUNT(*) INTO completed_appointments
  FROM "Appointment"
  WHERE "leadId" = p_lead_id AND status = 'COMPLETED';

  SELECT COUNT(*) INTO proposal_events
  FROM "Interaction"
  WHERE "leadId" = p_lead_id AND type = 'proposal_viewed';

  SELECT (email IS NOT NULL), (phone IS NOT NULL)
  INTO has_email, has_phone
  FROM "Lead"
  WHERE id = p_lead_id;

  computed_score := 10;
  computed_score := computed_score + LEAST(inbound_replies * 8, 32);
  computed_score := computed_score + LEAST(click_events * 6, 18);
  computed_score := computed_score + LEAST(booking_events * 12, 24);
  computed_score := computed_score + LEAST(completed_appointments * 10, 20);
  computed_score := computed_score + LEAST(proposal_events * 8, 16);

  IF has_email THEN
    computed_score := computed_score + 5;
  END IF;

  IF has_phone THEN
    computed_score := computed_score + 5;
  END IF;

  computed_score := LEAST(100, GREATEST(0, computed_score));

  UPDATE "Lead"
  SET score = computed_score,
      "updatedAt" = NOW()
  WHERE id = p_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION crm_recalculate_lead_score_from_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM crm_recalculate_lead_score(NEW."leadId");
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION crm_recalculate_lead_score_from_conversation_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id TEXT;
BEGIN
  SELECT "leadId" INTO v_lead_id
  FROM "Conversation"
  WHERE id = NEW."conversationId";

  IF v_lead_id IS NOT NULL THEN
    PERFORM crm_recalculate_lead_score(v_lead_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION crm_recalculate_lead_score_from_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM crm_recalculate_lead_score(NEW."leadId");
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_interaction_score ON "Interaction";
CREATE TRIGGER trg_crm_interaction_score
AFTER INSERT ON "Interaction"
FOR EACH ROW
EXECUTE FUNCTION crm_recalculate_lead_score_from_interaction();

DROP TRIGGER IF EXISTS trg_crm_message_score ON "ConversationMessage";
CREATE TRIGGER trg_crm_message_score
AFTER INSERT ON "ConversationMessage"
FOR EACH ROW
EXECUTE FUNCTION crm_recalculate_lead_score_from_conversation_message();

DROP TRIGGER IF EXISTS trg_crm_appointment_score ON "Appointment";
CREATE TRIGGER trg_crm_appointment_score
AFTER INSERT OR UPDATE OF status ON "Appointment"
FOR EACH ROW
EXECUTE FUNCTION crm_recalculate_lead_score_from_appointment();
