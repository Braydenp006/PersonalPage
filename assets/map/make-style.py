# Turns OpenFreeMap's plain "Positron" style (positron-original.json) into the About page's map, lab-style.json:
# light greys in the About page's colours, plain sans labels, with everything modern dropped (shields, airports, buildings).
# Run it again after changing a colour below:   python3 assets/map/make-style.py
# Or skip this and edit lab-style.json directly in Maputnik (maputnik.github.io): Open > Upload, then Export.
import json, os
here = os.path.dirname(os.path.abspath(__file__))
PALETTES = {
  # the About page's map, in its colours: white land, blue water, orange roads, navy text (dithered on the page)
  'lab-style.json': dict(name='Lab', PAPER='#fbfaf7', PAPER_DARK='#fde2c2', WATER='#a7d2f2', WATER_EDGE='#2f8fd0',
                         INK='#16304a', INK_SOFT='#5f7d96', ROAD='#f7931e', WATER_TEXT='#0a5a8e'),
}
def build(out, name, PAPER, PAPER_DARK, WATER, WATER_EDGE, INK, INK_SOFT, ROAD, WATER_TEXT):
  s = json.load(open(os.path.join(here, 'positron-original.json')))
  DROP = ('building', 'aeroway', 'airport', 'shield', 'road_shield', 'tunnel_', 'highway-name-path', 'highway_path',
             'road_area_pier', 'road_pier', 'landcover_ice', 'landcover_glacier', 'highway_major_subtle', 'highway_motorway_subtle')
  # OpenFreeMap's own sans (its glyph server, already in positron-original.json); the names are left over from a serif look
  SERIF, SERIF_CAPS, SERIF_ITALIC = ['Noto Sans Regular'], ['Noto Sans Bold'], ['Noto Sans Italic']
  layers = []
  for l in s['layers']:
      i, p, lay = l['id'], l.setdefault('paint', {}), l.setdefault('layout', {})
      if any(d in i for d in DROP):
          continue
      if i == 'background':
          p['background-color'] = PAPER
      elif i == 'water':
          p.update({'fill-color': WATER, 'fill-outline-color': WATER_EDGE})
      elif i in ('park', 'landcover_wood'):
          p.update({'fill-color': PAPER_DARK, 'fill-opacity': .55})
      elif i == 'landuse_residential':
          p.update({'fill-color': PAPER_DARK, 'fill-opacity': .35})
      elif i == 'waterway':
          p['line-color'] = WATER_EDGE
      elif 'casing' in i:
          p['line-opacity'] = 0   # no white-road-with-outline look: roads are single ink lines
      elif i.startswith('highway_'):
          p.update({'line-color': ROAD, 'line-opacity': .85})
          p['line-width'] = ['interpolate', ['linear'], ['zoom'], 6, .4, 10, 1, 14, 2.2] if 'motorway' in i or 'major' in i \
              else ['interpolate', ['linear'], ['zoom'], 10, .3, 14, 1.2]
      elif i.startswith('railway'):
          p['line-color'] = INK_SOFT if 'dash' not in i else PAPER
          if 'dash' not in i: p['line-width'] = 1.6
      elif i.startswith('boundary'):
          p.update({'line-color': INK_SOFT, 'line-dasharray': [3, 2]})
      elif l['type'] == 'symbol':
          p.update({'text-color': INK, 'text-halo-color': PAPER, 'text-halo-width': 1.2, 'text-halo-blur': .5})
          lay['text-font'] = SERIF
          if i.startswith('label_'):
              lay['text-font'] = SERIF_CAPS
              lay['text-transform'] = 'uppercase'
              lay['text-letter-spacing'] = .2           # spaced-out caps, like map lettering
          if 'water' in i:
              lay['text-font'] = SERIF_ITALIC
              lay['text-transform'] = 'uppercase'
              lay['text-letter-spacing'] = .3
              p['text-color'] = WATER_TEXT
          if i.startswith('highway-name'):
              p['text-color'] = INK_SOFT
      layers.append(l)

  s['layers'] = layers
  s['name'] = name
  json.dump(s, open(os.path.join(here, out), 'w'), indent=1)
  print(f'wrote {out}: {len(layers)} layers')

for out, palette in PALETTES.items():
  build(out, **palette)
