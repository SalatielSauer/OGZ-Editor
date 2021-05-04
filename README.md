
# OGZ-Editor
A browser tool for writing Sauerbraten .ogz files (maps) using JSON.<br>
https://salatielsauer.github.io/OGZ-Editor/index.html

#### JSOGZ.js
You can use **jsogz.js** or **jsogz.min.js** on your own page with the script tag:<br>
`<script src="jsogz.min.js"></script>`

This will make the `JSOGZ` function available, which receives 2 parameters:<br>
`JSOGZ({object}, type)`
- type 0
  returns hex concatenated as plain text.
- type 1
  returns a byte array containing the hex.
- type 2
  returns a byte array containing the .ogz, requires [pako](https://github.com/nodeca/pako).

The function will try to JSON.parse() the first parameter if you use a string instead of object.

##### JSOGZ Example:
```
JSOGZ(
  {
    "mapsize": 1024,
    "mapvars": {
      "maptitle": "hello!"
    },
    "entities": {
      "particles": {
        "attributes": "0 0 0 0xFF00 0",
        "position": "512 512 512"
      }
    }
  }, 0
)
```
##### Returns:
```
"4f4354411d000000240000000004000001000000000000000000000000000000010000000208006d61707469746c65060068656c6c6f2103667073000000000005000200040003000500070000000044000000440000004400000000000000ff0000050002020003000400050006000700000202000300040005000600070000020200030004000500060007000002020003000400050006000700000100000000000000000000000000010000000000000000000000000001000000000000000000000000000100000000000000000000000000"
```

### Octree Editing
On a size 10 map (1024x1024) the standard subdivision consists of 8 smaller cubes of size 512x512, and each of them can be subdivided into 8 more cubes.

The octree of a newmap has the following structure:
```
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
All children are divided into a lower and an upper layer, therefore, these layers consist of 4 cubes each.
![](https://raw.githubusercontent.com/SalatielSauer/ogz-editor/master/images/octree1.png)

#### Subdivisions
To add a subdivision to a child, simply create a new list within the previous list:
```
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
```
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

Although Sauer requires the entire Octree filled, even with empty cubes, you don't have to worry about specifying them manually as shown above, **JSOGZ** will fill all the missing space.

#### Textures
To add textures you can create an object within the list:
```
"geometry": [
  {"solid": {
    "textures": "1 2 3 4 5 6"
  }}
]
```
Each number is an index of a registered texture (the textures of the F2 menu ingame). Their positions determine which face of the cube it will be applied to: left right front back bottom top.
If you want to apply the same texture to all faces, set `allfaces` to 1:
```
"geometry": [
  {"solid": {
    "allfaces": "1",
    "textures": "9"
  }}
]
```
Cubes added after a texture definition will inherit it instead of using the default texture.
  
#### Corner Editing
Detailed cube manipulation is not yet supported.

#### Todo list:
- [x] Functions to read and convert data from json to hexadecimal
- [x] Simple json syntax error catcher
- [x] Light, Mapmodel, Playerstart, Envmap, Particles, Sound and Spotlight entities
- [x] Support multiple entities of the same type
- [ ] Teleport, Teledest and pickup entities
- [ ] Integer and Float mapvars
- [x] Octree editing & Textures
- [ ] Corner editing
- [ ] Materials
- [ ] Lightmaps
- [ ] Blendmaps
- [x] Concatenation and download
- [x] Conversion of the output to a valid .ogz file directly