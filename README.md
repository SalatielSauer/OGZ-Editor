
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
  - [OctaMap](#octamap)
  - [OctaMapvars](#octamapvars)
  - [OctaEntities](#octaentities)
  - [OctaGeometry](#octageometry)
  - [NodeJS](#nodejs)

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

The gif below shows a size 10 map with its first "chunk" subdivided once.
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
Detailed cube manipulation is not yet supported.

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

JSOCTA has the following classes and methods:
 ### OctaMap
 - `new OctaMap(object)`
 The main class, it formats the converted result of all other classes respecting the OCTA structure.
   - `.getString(callback)`
   Returns the concatenated result as plain text.
    ```js
    new OctaMap({
      "mapvars": {"skybox": "skyboxes/white"},
      "entities": [
        {"position": [768, 256, 512], "attributes": ["playerstart", 0, 0, 0, 0, 0]},
        {"position": [768, 256, 512], "attributes": ["teleport", 0, 193, 0, 0, 0]},
        {"position": [768, 256, 512], "attributes": ["teledest", 90, 1, 1, 0, 0]},
        {"position": [256, 256, 512], "attributes": ["teledest", 270, 0, 1, 0, 0]},
        {"position": [256, 256, 512], "attributes": ["teleport", 1, 196, 0, 0, 0]}
      ],
      "geometry": [{"solid": {"textures": [2]}}, {"solid": {"textures": [1]}}]
    }).getString((result) => {
      console.log(result)
    })
    ```
   - `.getByteArray(callback)` 
   Returns the concatenated result as an uncompressed byte array.
   - `.getOGZ(callback)`
   Returns the concatenated result as a compressed ([gzip](https://en.wikipedia.org/wiki/Gzip)) byte array, requires [pako](https://github.com/nodeca/pako) or any other gzip functionality that you can specify with the `gzip` property, by default it is pako.
    ```js
    const octamap = new OctaMap({})
    octamap.gzip = window.pako.gzip
    octamap.getOGZ((result) => {
      console.log(result)
    })
    ```

   This is just to make it intuitive, alternatively you can use `.getByteArray(callback)` directly with the gzip function of your choice, for example using zlib in NodeJS:
    ```js
    const zlib = require("zlib")
    const jsocta = require("./scripts/jsocta.js")
    const map = new jsocta.Map({})
    map.getByteArray((result) => {
      console.log(zlib.Gzip(result))
    })
    ```

 ### OctaMapvars
 - `new OctaMapvars(object)`
 Handles the formatting and conversion of the map variables object.
   - `.format(mapvar, callback)`
   Converts and concatenates the `mapvar.name` and `mapvar.value` of a single mapvar, returns a string.
    ```js
    new OctaMapvars().format({
        "name": "maptitle",
        "value": "Untitled map by Unknown"
    }, (result)=>{
        console.log(result)
    })
    ```
   - `.get(callback)`
   Returns an object with the name and value of all mapvars in `object`.
   - `.read(callback)`
   Uses the `.format` and `.get` methods to convert, concatenate and return all the mapvars of the `object` as a string.

 ### OctaEntities
 - `new OctaEntities(array)`
 Handles the formatting and conversion of the map entities.
   - `.format(entity, callback)`
   Converts and concatenates the `entity.position` and `entity.attributes` of a single entity, returns a string.
    ```js
    new OctaEntities().format({
        "position": [512, 512, 512],
        "attributes": ["mapmodel", 0, 177, 0, 0, 0]
    }, (result)=>{
        console.log(result)
    })
    ```
   - `.get(callback)`
   Returns an object with the position and attributes of all entities in `array`.
   - `.read(callback)`
   Uses the `.format` and `.get` methods to convert, concatenate and return all the entities of the `array` as a string.

 ### OctaGeometry
 - `new OctaGeometry(array)`
 Handles the formatting and conversion of the map octree.
   - `.format(cube, callback, ?properties)`
   Converts and concatenates the single item/object `cube` and its properties, if any. Returns a string.
    ```js
    new OctaGeometry().format({
        "solid": {textures: [1, 2, 3, 4, 5, 6]}
    }, (result)=>{
        console.log(result)
    })
    ```
   - `.get(callback)`
   Returns an object with the type and properties of all cubes in `array`.
   - `.read(callback)`
   Uses the `.format` and `.get` methods to convert, concatenate and return all the cubes of the `array` as a string.
   - `.insert(child, start, end, maxdepth)`
   (Experimental) Inserts a `child` in `array`, with initial index at `start` and final index at `end`, the subdivisions are determined by `maxdepth`.
    ```js
    let array = []
    new OctaGeometry(array).insert("solid", 2, 5, 4)
    console.log(array)
    ```

 ### NodeJS
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
   new jsocta.Mapvars({}).format((result) => {
    console.log(result)
   })
   ```

<hr>

#### JSOCTA<br>
- [ ] Support latest mapversion (version 29 is the only one documented)
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
  - [x] Fill undefined space with empty cubes
  - [x] Inherit last texture from previous added cube
  - [ ] Complex shapes (edges/corners editing)
  - [ ] Materials (alpha, clip, death, gameclip, lava, noclip, water) 
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