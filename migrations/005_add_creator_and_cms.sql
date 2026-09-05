-- Add 'creator' role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'creator';

-- Create CMS Content table
CREATE TABLE IF NOT EXISTS cms_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'video', 'json', 'card_list')) DEFAULT 'text',
  section TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Index for faster lookups by section
CREATE INDEX IF NOT EXISTS idx_cms_section ON cms_content(section);

-- Insert default content to prevent empty page
INSERT INTO cms_content (key, value, type, section, description) VALUES
('hero_title', 'الهيئة الوطنية للعدول بالمغرب', 'text', 'hero', 'Main title on the landing page'),
('hero_subtitle', 'منصة التوثيق العدلي الإلكتروني', 'text', 'hero', 'Subtitle below main title'),
('hero_image', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80', 'image', 'hero', 'Main background image'),
('welcome_video', '', 'video', 'hero', 'YouTube Embed URL (optional)'),
('cards_data', '[
  {"title": "خدمات العدول", "description": "تسهيل عملية التوثيق والتعاقد", "icon": "⚖️"},
  {"title": "الفضاء الرقمي", "description": "خدمات إلكترونية متكاملة", "icon": "💻"},
  {"title": "المساعدة القضائية", "description": "دعم وإرشاد قانوني", "icon": "🤝"}
]', 'card_list', 'features', 'JSON list of feature cards')
ON CONFLICT (key) DO NOTHING;
