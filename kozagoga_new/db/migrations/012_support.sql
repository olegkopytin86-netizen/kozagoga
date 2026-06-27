-- ═══════════════════════════════════════════════════════
-- 012_support.sql
-- Система поддержки (Support Desk)
-- (SRS Модуль 11)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  order_id        UUID REFERENCES orders(id),
  category        VARCHAR(50) NOT NULL,
    -- key_not_received | code_not_working | activation_failed | refund | other
  subject         VARCHAR(255) NOT NULL,
  description     TEXT,
  priority        VARCHAR(20) DEFAULT 'normal',
    -- low | normal | high | urgent
  status          VARCHAR(30) DEFAULT 'open',
    -- open | in_progress | waiting_customer | resolved | closed
  assigned_to     UUID REFERENCES users(id),
  resolution      TEXT,
  rating          INT CHECK (rating >= 1 AND rating <= 5),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority, status);

CREATE TABLE IF NOT EXISTS support_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id),
    -- NULL = system
  sender_type     VARCHAR(20) NOT NULL,
    -- customer | operator | system
  message         TEXT NOT NULL,
  attachments     JSONB DEFAULT '[]',
    -- [{ filename, url, size }]
  is_internal     BOOLEAN DEFAULT false,
    -- только для операторов
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_msg_ticket ON support_messages(ticket_id);

-- Триггер: обновление updated_at при новом сообщении
CREATE OR REPLACE FUNCTION update_ticket_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE support_tickets
  SET updated_at = NOW(),
      status = CASE
        WHEN NEW.sender_type = 'customer' AND status = 'resolved' THEN 'open'
        WHEN NEW.sender_type = 'operator' AND status = 'waiting_customer' THEN 'in_progress'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_message ON support_messages;
CREATE TRIGGER trg_ticket_message
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_on_message();

COMMENT ON TABLE support_tickets IS 'Тикеты поддержки с категориями, SLA-приоритетами и статусами';
COMMENT ON TABLE support_messages IS 'Сообщения внутри тикета (customer/operator/system)';
COMMENT ON COLUMN support_messages.is_internal IS 'Внутренняя заметка (видна только операторам)';
