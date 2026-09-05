-- Add extra_blocks container for the landing page (creator portal)
INSERT INTO cms_content (key, value, type, section, description)
VALUES (
  'extra_blocks',
  '[]',
  'json',
  'landing',
  'JSON array of extra blocks (text/image/video) rendered on the landing page'
)
ON CONFLICT (key) DO NOTHING;

