# PHP static generator gulpfile

This project is mostly a proof of concept showing how to use [Gulp][] to render a collection of PHP files to static HTML. A simple gulpfile linking to a few modules from in Gulp's vibrant ecosystem make it easy to add extras like a LiveReload integrated local webserver, Sass compilation and markdown rendering.

##### What this does
- Complete 1-to-1 mirroring of an arbitrarily nested directory structure, including auto-removal of deleted and renamed files
- Starts a local webserver with LiveReload, including automatic middleware injection of LiveReload code snippets
- Copying static files to the build directory
- Auto-compilation of Sass stylesheets
- Markdown pre-processing of HTML output

##### What this doesn't do
- There’s not much of anything in PHP's global `$_SERVER` array. But you weren't counting on that anyway. Right?


## Working with Gulp

The gulpfile contains several tasks, these are the main ones that combine to do most of the work:

* `gulp build` - Builds a fresh copy of the site, after first cleaning out any existing build files.
* `gulp watch` - Starts a local webserver to preview changes. `gulp build` is automatically run when the server starts up.
* `gulp clean` - Removes the build folder.


## Setup instructions

1. Make sure gulp is installed globally: `npm install -g gulp`
2. Clone the repo:
    `git clone https://github.com/joemaller/php-static-generator-gulpfile.git`
3. install everything from package.json: `npm install`


## Prerequisites
You need to have node and PHP installed. Mac instructions are below. If you're on Linux, you probabaly already know this. I've never set these up on Windows, so I can't help there.

#### Mac Setup instructions

1. Install [Xcode][] from the Mac App Store. 
2. Install [Homebrew][]
3. Use homebrew to install [node.js][]: `brew install node`
4. Use homebrew to [install PHP][]:
    * `brew tap homebrew/dupes`
    * `brew tap homebrew/versions`
    * `brew tap homebrew/homebrew-php`
    * `brew install php55` or `brew install php56`


[xcode]: https://itunes.apple.com/us/app/xcode/id497799835?mt=12
[homebrew]: http://brew.sh/
[node.js]: http://nodejs.org/
[install PHP]: https://github.com/Homebrew/homebrew-php#installation
[gulp]: http://gulpjs.com/