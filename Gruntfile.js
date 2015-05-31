/*!
 * eams-ui's Gruntfile
 * Copyright 2013-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

module.exports = function (grunt) {
  'use strict';

  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  RegExp.quote = function (string) {
    return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  var fs = require('fs');
  var path = require('path');

  var autoprefixerBrowsers = [
    "Android 2.3",
    "Android >= 4",
    "Chrome >= 20",
    "Firefox >= 24",
    "Explorer >= 8",
    "iOS >= 6",
    "Opera >= 12",
    "Safari >= 6"
  ];

  // Project configuration.
  grunt.initConfig({

    // Metadata.
    pkg: grunt.file.readJSON('package.json'),

    // Task configuration.
    clean: {
      dist: 'dist',
      docs: 'docs/dist'
    },

    jshint: {
      options: {
        jshintrc: 'src/js/.jshintrc'
      },
      grunt: {
        options: {
          jshintrc: 'grunt/.jshintrc'
        },
        src: ['Gruntfile.js', 'grunt/*.js']
      },
      core: {
        src: 'src/js/*.js'
      }
    },

    jscs: {
      options: {
        config: 'src/js/.jscsrc'
      },
      grunt: {
        src: '<%= jshint.grunt.src %>'
      },
      core: {
        src: '<%= jshint.core.src %>'
      }
    },

    copy: {

      js: {
        expand: true,
        cwd: 'src/js',
        src: '**/*',
        dest: 'dist/'
      },

      less: {
        expand: true,
        cwd: 'src',
        src: 'less/**/*',
        dest: 'dist/'
      },

      docs: {
        expand: true,
        cwd: 'dist/',
        src: [
          '**/*'
        ],
        dest: 'docs/dist/'
      }

    },

    uglify: {
      options: {
        preserveComments: 'some'
      },
      js: {
        src: 'dist/semi-auto-table.js',
        dest: 'dist/semi-auto-table.min.js'
      }
    },

    less: {
      compileCore: {
        options: {
          strictMath: true,
          sourceMap: true,
          outputSourceFiles: true,
          sourceMapURL: 'semi-auto-table.css.map',
          sourceMapFilename: 'dist/css/semi-auto-table.css.map'
        },
        src: 'src/less/semi-auto-table.less',
        dest: 'dist/css/semi-auto-table.css'
      }
    },

    autoprefixer: {
      options: {
        browsers: autoprefixerBrowsers
      },
      core: {
        options: {
          map: true
        },
        src: ['dist/css/semi-auto-table.css']
      }
    },

    htmllint: {
      options: {
        ignore: [
          'Attribute "autocomplete" not allowed on element "button" at this point.',
          'Attribute "autocomplete" not allowed on element "input" at this point.',
          'Element "img" is missing required attribute "src".',
          'Consider using the “h1” element as a top-level heading only (all “h1” elements are treated as top-level headings by many screen readers and other tools).',
          'Start tag seen without seeing a doctype first. Expected “<!DOCTYPE html>”.',
          'Non-space characters found without seeing a doctype first. Expected “<!DOCTYPE html>”.',
          'Element “head” is missing a required instance of child element “title”.',
          'Stray doctype.',
          'Stray start tag “html”.',
          'Cannot recover after last error. Any further errors will be ignored.'
        ]
      },
      src: 'docs/**/*.html'
    },

    bootlint: {
      options: {
        stoponerror: false,
        relaxerror: ['W001', 'W002', 'W003', 'W005', 'E001']
      },
      files: ['docs/*.html']
    },

    csslint: {
      options: {
        csslintrc: 'src/less/.csslintrc'
      },
      dist: [
        'dist/css/semi-auto-table.css'
      ]
    },

    cssmin: {
      options: {
        compatibility: 'ie8',
        keepSpecialComments: '*',
        advanced: false
      },
      minifyCore: {
        src: 'dist/css/semi-auto-table.css',
        dest: 'dist/css/semi-auto-table.min.css'
      }
    },

    csscomb: {
      options: {
        config: 'less/.csscomb.json'
      },
      dist: {
        expand: true,
        cwd: 'dist/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'dist/css/'
      }
    },

    watch: {
      src: {
        files: '<%= jshint.core.src %>',
        tasks: ['jshint:src', 'concat']
      },
      less: {
        files: 'src/less/*.less',
        tasks: 'less'
      }
    },

    exec: {
      npmUpdate: {
        command: 'npm update'
      }
    },

    compress: {
      main: {
        options: {
          archive: 'semi-auto-table-<%= pkg.version %>-dist.zip',
          mode: 'zip',
          level: 9,
          pretty: true
        },
        files: [
          {
            expand: true,
            src: ['dist/**'],
            dest: 'semi-auto-table-<%= pkg.version %>-dist'
          }
        ]
      }
    }

  });


  // These plugins provide necessary tasks.
  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
  require('time-grunt')(grunt);

  grunt.registerTask('less-compile', ['less']);

  grunt.registerTask('dist-js', ['copy:js', 'uglify']);
  grunt.registerTask('dist-css', ['copy:less', 'less-compile', 'autoprefixer', 'csscomb', 'cssmin']);
  grunt.registerTask('dist', ['clean', 'dist-js', 'dist-css']);

  grunt.registerTask('default', ['dist']);

  grunt.registerTask('docs', ['copy:docs', 'htmllint', 'bootlint']);

  grunt.registerTask('prep-release', ['docs', 'compress']);

};
