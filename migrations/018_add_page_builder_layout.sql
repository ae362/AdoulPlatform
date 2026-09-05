-- CMS key used by the interactive page builder (Creator portal)
INSERT INTO cms_content (key, value, type, section, description)
VALUES (
  'page_builder_layout',
  '{"version":1,"rootId":"root","nodes":{"root":{"id":"root","type":"container","name":"Page","parentId":null,"children":[],"props":{},"style":{"padding":"24px","backgroundColor":"#ffffff"}}}}',
  'json',
  'builder',
  'Page builder layout JSON (v1)'
)
ON CONFLICT (key) DO NOTHING;
