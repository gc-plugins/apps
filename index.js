'use strict';

let shell = require('electron').shell,
    fs = require('fs'),
    path = require('path'),
    jetpack = require('fs-jetpack'),
    fuzzy = require('fuzzy'),
    LOCATIONS,
    OPTS,
    DESC;

switch (process.platform) {
    case 'win32':
        LOCATIONS = [
            process.env.ProgramData + '\\Microsoft\\Windows\\Start Menu\\Programs',
            process.env.AppData + '\\Microsoft\\Windows\\Start Menu\\Programs'
        ];
        OPTS = {
            matching: '**/*.lnk'
        };
        // On Windows, the description should show the parent Programs menu folder, if any.
        DESC = (loc, item) => {
            let description;

            // Resolve to an absolute path.
            item = path.resolve(item);

            description = path.dirname(path.relative(loc, item));
            // If the app is on the top level, don't show ".".
            if (description === '.') {
                description = '';
            }

            return description;
        };
        break;
    case 'darwin':
        LOCATIONS = [
            '/Applications',
            process.env.HOME + '/Applications'
        ];
        // Search in immediate children of the Applications directories.
        LOCATIONS.forEach((loc) => {
            let dirs = jetpack.find(loc, {
                    matching: '!**/*.app',
                    files: false,
                    directories: true,
                    recursive: false
                });

            LOCATIONS = LOCATIONS.concat(dirs);
        });
        OPTS = {
            matching: '**/*.app',
            directories: true,
            // Too many symlinks breaks recursive search on macOS.
            recursive: false
        };
        // On macOS, the description should show the full app path.
        DESC = (loc, item) => {
            return path.resolve(item);
        };
        break;
    default:
        // Unsupported OS.
        LOCATIONS = [];
        OPTS = {};
        DESC = () => '';
}

let apps = [];

exports.init = ({config}) => {
    // Clear previous results.
    apps = [];

    LOCATIONS.forEach((loc) => {
        jetpack.findAsync(loc, OPTS)
        .then((paths) => {
            let results = paths.map((item) => {
                let description = '';

                // Force path to be absolute.
                item = path.resolve(item);

                apps.push({
                    key: item,
                    title: path.parse(item).name,
                    description: DESC(loc, item),
                    icon: undefined
                });
            });
        });
    });
};

exports.process = ({term, stream}) => {
    let results = [],
        items = {};

    // Force no results for an empty string.
    if (/^\s*$/.test(term)) {
        stream.write(undefined);
        stream.end();
        return;
    }

    results = fuzzy.filter(term, apps, {
        extract: (item) => item.title
    });

    if (results.length) {
        results.forEach((item) => {
            let id = Math.random();

            item = item.original;

            stream.write(item);
        });
    }
    else {
        stream.write(undefined);
        stream.end();
    }
};

exports.execute = ({key}) => {
    return new Promise((resolve, reject) => {
        let success = shell.openItem(key);

        if (success) {
            resolve();
        }
        else {
            reject();
        }
    });
};

exports.keyword = undefined;
