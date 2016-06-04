# webgme-fab
WebGME-fab is a floating action button for webgme apps (using [materializecss](http://materializecss.com/buttons.html)). By default it provides capability for running plugins but can be extended with custom actions (such as creating a new node).

## Quick Start
Add the `FloatingActionButton` to your webgme app with
```
webgme import viz FloatingActionButton webgme-fab
```

Then add it to your layout as done in [deepforge](https://github.com/dfst/deepforge).

## Examples
This repository is a functioning example of the FloatingActionButton. First, make sure you have an instance of mongo running locally. Then simply clone and run it for an example:

```
git clone https://github.com/dfst/webgme-fab
cd webgme-fab
npm install
npm start
```

Then navigate to `http://localhost:8888` in a browser to see the example!
