# OGZ-Editor
A browser tool for writing Sauerbraten .ogz files (maps) using JSON.<br>
https://salatielsauer.github.io/OGZ-Editor/index.html

#### Using externally
You can embed **jsogz.js** or **jsogz.min.js** on your own page using the script tag:<br>
`<script src="https://raw.githubusercontent.com/SalatielSauer/OGZ-Editor/master/jsogz.min.js"></script>`

This will make the `getOGZ` function available, which receives 2 parameters:

`getOGZ({object}, type)`
- type 0
	returns hex concatenated as plain text.
- type 1
	returns a byte array containing the hex.
- type 2
	returns a byte array containing the .ogz, requires [pako](https://github.com/nodeca/pako).

The function will try to JSON.parse() the first parameter if you use a string instead of object.

##### Example:
```
getOGZ(
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

#### Todo list:
- [x] Functions to read and convert data from json to hexadecimal
- [x] Simple json syntax error catcher
- [x] Light, Mapmodel, Playerstart, Envmap, Particles, Sound and Spotlight entities
- [x] Support multiple entities of the same type
- [ ] Teleport, Teledest and pickups entities
- [ ] Integer and Float mapvars
- [ ] Textures
- [ ] Octree editing
- [ ] Materials
- [ ] Lightmaps
- [ ] Blendmaps (unlikely)
- [x] Concatenation and download
- [x] Conversion of the output to a valid .ogz file directly
