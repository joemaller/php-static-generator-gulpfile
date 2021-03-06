# PHP static generator gulpfile

This project is mostly a proof of concept showing how to use [Gulp][] to render a collection of PHP files to static HTML. A simple gulpfile linking to a few modules from Gulp's vibrant ecosystem make it easy to add extras like a local auto-reloading BrowserSync webserver, static file copying and automatic Sass compilation.

##### What this does
- Complete 1-to-1 mirroring of an arbitrarily nested directory of PHP source files, including auto-removal of deleted and renamed files
- Correct referencing of nested includes
- Static file mirroring
- Starts a local [BrowserSync][] webserver

##### What this doesn't do
- There’s not much of anything in PHP's global `$_SERVER` array. But you weren't counting on that anyway. Right? Magic PHP variables `__FILE__` and `__DIR__` also don't work.
- There's no dependency-graph of includes, changing a nested file won't trigger a re-render of the files that reference it. If you've got a directory of include files, add a `watch` that calls the `php` task to rebuild everything if those files change.
- [phpinfo() outputs plain text][phpinfo] instead of HTML when using the CLI mode.


## Working with Gulp

These are the main gulpfile tasks which combine to do most of the work:

* `gulp build` - Builds a fresh copy of the site, after first cleaning out any existing build files.
* `gulp watch` - Starts a local webserver to preview changes. `gulp build` is automatically run when the server starts up.
* `gulp clean` - Removes the build folder.


## Setup instructions

1. Make sure gulp is installed globally: `npm install -g gulp`
2. Clone the repo:
    `git clone https://github.com/joemaller/php-static-generator-gulpfile.git`
3. install everything from package.json: `npm install`


## Prerequisites
You need to have node and PHP installed. Mac instructions are below. If you're on Linux, you probably already know this. I've never set these up on Windows, so I can't help there.

#### Mac Setup instructions

1. Install [Xcode][] from the Mac App Store. 
2. Install [Homebrew][]
3. Use homebrew to install [node.js][]: `brew install node`
4. Use homebrew to [install PHP][]:
    * `brew tap homebrew/dupes`
    * `brew tap homebrew/versions`
    * `brew tap homebrew/homebrew-php`
    * `brew install php55` or `brew install php56`


## Additional notes

##### Composer
[Composer][] works just fine. Be sure to reference the autoloader like this:

    require get_include_path() . '/../vendor/autoload.php';

##### Two to the power of 276,709 to one against

This example is completely insane, and deeply irresponsible: The **source/twig.php** file demonstrates how the gulpfile can be used to render a flat HTML file from a PHP file linking to a [Twig template][twig] which includes two sub-templates. There is absolutely no reason anyone should ever do this. Madness.

[xcode]: https://itunes.apple.com/us/app/xcode/id497799835?mt=12
[homebrew]: http://brew.sh/
[node.js]: http://nodejs.org/
[install PHP]: https://github.com/Homebrew/homebrew-php#installation
[gulp]: http://gulpjs.com/
[twig]: http://twig.sensiolabs.org/
[phpinfo]: http://php.net/manual/en/function.phpinfo.php#refsect1-function.phpinfo-notes
[composer]: http://getcomposer.org
[browsersync]: http://www.browsersync.io

