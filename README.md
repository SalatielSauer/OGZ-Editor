
# OGZ-Editor
A browser tool for writing [Sauerbraten](http://sauerbraten.org/) .ogz files (maps) using JSON.<br>
https://salatielsauer.github.io/OGZ-Editor/

- [OGZ Editor](#ogz-editor)
  - [Map Variables](#map-variables)
  - [Entities](#entities)
  - [Octree Editing](#octree-editing)
    - [Subdivisions](#subdivisions)
    - [Textures](#textures)
    - [Corner Editing](#corner-editing)
- [JSOCTA](#jsocta)
  - [Classes](#classes)
  - [Common Methods](#common-methods)
  - [NodeJS Module](#nodejs-module)
  - [Getting the OGZ file](#getting-the-ogz-file)
    - [Browser](#browser-pakogzip)
    - [NodeJS](#nodejs-zlibgzip)

### Map Variables
To apply mapvars you must pay special attention to their types, strings must be enclosed in double quotes and RGB colors must be defined as arrays.
```json
"mapvars": {
  "maptitle": "a beautiful map",
  "atmo": 1,
  "cloudlayer": "skyboxes/clouds01",
  "cloudfade": 0.9,
  "cloudscrollx": 0.01,
  "sunlight": [255, 100, 255]
}
```

### Entities
Entities have two array properties: `position` and `attributes`, the position receives the XYZ values and the attributes vary depending on the entity, but the first index is always its type.
```json
"entities": [
  {
    "position": [512, 512, 512],
    "attributes": ["mapmodel", 0, 0, 0, 0, 0]
  }
]
```
For entity colors you can use the short hex string or an RGB array.
```json
"entities": [
  {
    "position": [512, 512, 512],
    "attributes": ["particles", 0, 0, 0, "0xFFFF", 0]
  },
  {
    "position": [512, 512, 528],
    "attributes": ["particles", 0, 0, 0, [255, 100, 255], 0]
  }
]
```

### Octree Editing
On a size 10 map (1024x1024) the standard subdivision consists of 8 smaller cubes of size 512x512, and each of them can be subdivided into 8 more cubes.

The octree of a newmap has the following structure:
```json
"geometry": [
  "solid",
  "solid",
  "solid",
  "solid",
  "empty",
  "empty",
  "empty",
  "empty"
]
```
All children are divided into a lower and an upper layer, these layers consist of 4 cubes each.
![](https://raw.githubusercontent.com/SalatielSauer/ogz-editor/master/images/octree1.png)

#### Subdivisions
To create a subdivision in a child, add a new list within the previous list:
```json
"geometry": [
  "solid",
  "solid",
  "solid",
  "solid",
  "empty",
  [
    "empty",
    "empty",
    "solid",
    "empty",
    "empty",
    "empty",
    "solid",
    "empty"
  ],
  "empty",
  "empty"
]
```
Each list reduces the size of the cube in half, that is, a subdivision of a 512x512 cube will create 8 new 256x256 cubes within it.

The gif below shows a size 10 map with its first "chunk" subdivided once.<br>
![](https://raw.githubusercontent.com/SalatielSauer/ogz-editor/master/images/octree2.gif)<br>
The non-optimized structure (before remip or calclight) would look like:
```json
"geometry": [
  [
    "solid",
    "solid",
    "solid",
    "solid",
    "solid",
    "solid",
    "solid",
    "solid",
  ],
  "solid",
  "solid",
  "solid",
  "empty",
  "empty",
  "empty",
  "empty"
]
```
There are some tricks to reduce the number of children, so when executing `/remip` unnecessary subdivisions are removed or converted to pushed faces.

Although Sauer requires the entire Octree filled, even with empty cubes, you don't have to worry about specifying them manually as shown above, **JSOCTA** will fill all the missing space.

#### Textures
To add textures you can create an object within the list and define its `textures` property:
```js
"geometry": [
  {"solid": {
    "textures": [1, 2, 3, 4, 5, 6]
  }}
]
```
Each number is an index of a registered texture (the textures of the F2 menu in game). Their positions determine which face of the cube it will be applied to: left right back front bottom top.
Undefined faces will inherit the last texture, to have an "allfaces" effect you only have to set the first texture.
```js
"geometry": [
  {"solid": {
    "textures": [9]
  }}
]
```
Cubes added without a texture property will inherit the last texture from the last cube.
  
#### Corner Editing
Similar to textures, to manipulate corners you can set the `edges` property of the object:
```js
"geometry": [
  {"solid": {
    "edges": {
      "top": [1, 2, 3, 4]
    }
  }}
]
```
Each number is a corner of the face, the order of the corners are: upper-left upper-right lower-left lower-right.
Each corner can be pushed a total of 8 times, 0 means no push.
As a reference, you can find the front face when the origin box is in the lower left corner of the selection.<br>
![](https://raw.githubusercontent.com/SalatielSauer/ogz-editor/master/images/corner-manipulation-1.png)<br>

<hr>

# JSOCTA
JSOCTA is what powers OGZ Editor, it consists of functions that read, format and convert the contents of a JavaScript object to a valid OGZ.

You can easily install [**jsocta.js**](https://raw.githubusercontent.com/SalatielSauer/OGZ-Editor/master/scripts/jsocta.js) on your own page with the script tag:<br>
```html
<script src="jsocta.js"></script>
```
or in NodeJS:
```js
const jsocta = require("./scripts/jsocta.js")
```
If you don't have NodeJS installed and want to do more than what OGZ-Editor provides, you can access all classes and methods using your browser's developer tools console (F12 while on the [OGZ-Editor page](https://salatielsauer.github.io/OGZ-Editor/)).

### Classes
JSOCTA has the following classes:
- `new OctaMap(object)`
The main class, it formats the converted result of all other classes respecting the OCTA structure.

- `new OctaMapvars(object)`
Handles the formatting and conversion of the map variables object.

- `new OctaEntities(array)`
Handles the formatting and conversion of the map entities array.

- `new OctaGeometry(array)`
Handles the formatting and conversion of the map octree array.

### Common Methods
All the above classes have the following methods:
- `.format(object)`
 Converts a single item and returns it as a string array.
- `.getStringArray()`
 Converts and returns all (string) items as an array.
- `.getString()`
 Converts and returns all items as a concatenated string.
- `.getByteArray()`
 Converts, concatenates and returns all items as a byte array.

### NodeJS Module
`module.exports` has the classes in the following properties:
```
Map: OctaMap,
MapVars: OctaMapvars,
Entities: OctaEntities,
Geometry: OctaGeometry
```
to access them just `require` the jsocta.js file:
```js
const jsocta = require(".scripts/jsocta.js")
console.log(new jsocta.Mapvars({}).getString())
```

### Getting the OGZ file
To get a valid ogz you need to compress the value of `.getByteArray()` using [gzip](https://en.wikipedia.org/wiki/Gzip).

#### Browser [pako.gzip](https://github.com/nodeca/pako)
```html
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.0.3/pako.min.js"></script>
  <script src="scripts/jsocta.js"></script>
</head>
<body>
  <script>
    console.log(
      pako.gzip(
        new OctaMap({
          "mapvars": {"maptitle": "map generated with the browser"},
          "geometry": ["solid", {"solid": {"textures": [3]}}]
        }).getByteArray()
      )
    )
  </script>
</body>
```

#### NodeJS [zlib.gzip](https://nodejs.org/api/zlib.html)
```js
const zlib = require("zlib")
const jsocta = require("./scripts/jsocta.js")

zlib.gzip(
  new jsocta.Map({
    "mapvars": {"maptitle": "map generated with nodejs"},
    "geometry": ["solid", {"solid": {"textures": [3]}}]
  }).getByteArray(), (error, result) => {
    console.log(result)
  }
)
```

<hr>

#### JSOCTA <br>
- [x] Support mapversion 33
- [ ] Read and convert octa to .json
- [x] Process and convert .json to octa
  ###### Mapvars
  - [x] Integer, Float and String mapvars
  - [x] Convert RGB array to decimal
  ###### Entities
  - [x] Support all entities
  - [x] Support multiple entities of the same type
  - [ ] Support negative values of entity attributes
  ###### Octree
  - [x] Orderly Octree editing & Textures
  - [ ] Support cube insertion at a specific coordinate and size (the `OctaGeometry.insert()` method)
  - [ ] Support for copying and pasting geometry chunks
  - [x] Fill undefined space with empty cubes
  - [x] Inherit last texture from previous added cube
  - [x] Complex shapes (edges/corners editing)
  - [ ] Materials (alpha, clip, death, gameclip, lava, noclip, water)
  - [ ] Virtual Slots
  - [ ] Lightmaps
  - [ ] Blendmaps

#### OGZ Editor
- [x] JSON syntax highlighting
- [x] JSON error feedback
- [x] Tab & Shift+Tab indentation
- [x] Option to save the file directly to disk without downloading (and CTRL+S shortcut)

<hr>

OGZ Editor & JSOCTA by Salatiel S.<br>
Special thanks to [James Stanley](https://incoherency.co.uk/blog/) for his very helpful [**documentation**](http://web.archive.org/web/20201112035903/https://incoherency.co.uk/interest/sauer_map.html) regarding version 29 of the Sauerbraten map format.