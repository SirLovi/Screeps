'use strict';
const optional = require('require-optional');

module.exports = function(grunt) {
    const config = require('./screeps.json');
    if(!config.branch) {
        config.branch = 'sim';
    }
    if(!config.ptr) {
        config.ptr = false;
    }
    if(!config.publishDir) {
        config.publishDir = 'pub/';
    }

    require('load-grunt-tasks')(grunt);

    const reintegrate = optional(`./overrides/reintegrate-${grunt.option('reintegrate')}.json`)
        || optional('./overrides/reintegrate.json')
        || optional('./reintegrate.json');

    // Override branch in screeps.json
    // grunt deploy --branch=<customBranch>
    let branch = false;
    if(grunt.option('branch')) branch = grunt.option('branch');

    const submodules = ['internal', 'public'];
    if (grunt.file.exists('./overrides/.git')) submodules.push('overrides');

    const gitfetch = {};
    submodules.forEach(function(subdir) {
        gitfetch[subdir] = {
            options: {
                cwd: subdir,
                all: true,
            },
        };
    });

    grunt.initConfig({
        screeps: {
            options: {
                email: config.email,
                password: config.password,
                branch: branch ? branch : config.branch,
                ptr: config.ptr
            },
            dist: {
                src: ['dist/*.js']
            }
        },
        watch: {
            scripts: {
                files: [
                    'public/*.js',
                    'internal/*.js',
                    'overrides/*.js'
                ],
                tasks: ['deploy'],
                options: {
                    spawn: false
                }
            }
        },
        clean: ['dist/','pack/'],
        copy: {
            public: {
                files: [{
                    expand: true,
                    cwd: 'public/',
                    src: ['**/*.js'],
                    dest: 'dist/',
                    filter: 'isFile',
                    rename: function (dest, src) {
                        // Change the path name. utilize dots for folders
                        return dest + src.replace(/\//g,'.');
                    }
                }]
            },
            internal: {
                files: [{
                    expand: true,
                    cwd: 'internal/',
                    src: ['**/*.js'],
                    dest: 'dist/',
                    filter: 'isFile',
                    rename: function (dest, src) {
                        // Change the path name. utilize dots for folders
                        return dest + src.replace(/\//g,'.');
                    }
                }]
            },
            overrides: {
                files: [{
                    expand: true,
                    cwd: 'overrides/',
                    src: ['**/*.js'],
                    dest: 'dist/',
                    filter: 'isFile',
                    rename: function (dest, src) {
                        // Change the path name. utilize dots for folders
                        return dest + src.replace(/\//g,'.');
                    }
                }]
            },
            publish: {
                files: [{
                    expand: true,
                    cwd: 'dist/',
                    src: ['**/*.js'],
                    dest: config.publishDir,
                    filter: 'isFile',
                    rename: function (dest, src) {
                        // Change the path name. utilize dots for folders
                        return dest + src.replace(/\//g,'.');
                    }
                }]
            },
            webpackPublish: {
                files: [{
                    expand: true,
                    cwd: 'pack/',
                    src: './main.js',
                    dest: config.publishDir,
                }]
            }
        },
        webpack: {
            main: {
                entry: ['./dist/main.js'],
                output: {
                    path: 'pack/',
                    filename: 'main.js',
                    libraryTarget: 'commonjs2'
                },
                resolve: {
                    modulesDirectories: ["web_modules", "node_modules", "dist"],
                },
                module: {
                    loaders: [{
                        test: /\.js$/,
                        exclude: /(src|node_modules|ScreepsAutocomplete)/,
                        loader: 'babel-loader',
                        query: {
                            presets: [
                                require.resolve('babel-preset-es2016')
                            ]
                        }
                    }]
                }
            }
        },
        uglify: {
            my_target: {
                files: [{
                    expand: true,
                    cwd: 'pack',
                    src: 'main.js',
                    dest: 'pack'
                }]
            }
        },
        reintegrate: {
            options: reintegrate,
        },
        gitfetch: gitfetch,
    });
    //
    grunt.registerTask('switch-to-pack-deploy', function () {
        grunt.config.set('screeps.dist.src', ['pack/main.js']);
    });
    // clean deployment (dry run)
    grunt.registerTask('default', ['clean', 'copy:public', 'copy:internal', 'copy:overrides']);
    // clean deployment
    grunt.registerTask('deploy', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'screeps']);
    // clean deployment to directory
    grunt.registerTask('publish', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'copy:publish']);
    //grunt.registerTask('publish', ['clean', 'copy:public', 'copy:internal', 'copy:overrides']);
    // clean deployment (public only)
    grunt.registerTask('public-deploy', ['clean', 'copy:public', 'screeps']);
    // single file [experimental] (dry run)
    grunt.registerTask('compress', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack']);
    // single file [experimental]
    grunt.registerTask('compress-deploy', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack', 'switch-to-pack-deploy','screeps']);
    grunt.registerTask('compress-publish', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack', 'copy:webpackPublish']);
    // uglified [experimental] (dry run)
    grunt.registerTask('ugly', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack', 'uglify']);
    // uglified [experimental]
    grunt.registerTask('ugly-deploy', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack', 'uglify', 'switch-to-pack-deploy', 'screeps']);
    grunt.registerTask('ugly-publish', ['clean', 'copy:public', 'copy:internal', 'copy:overrides', 'webpack', 'uglify', 'copy:webpackPublish']);
    grunt.registerTask('reintegrate', 'Create a new integration branch with branches configured from reintegrate.json', function(branch, targetOption) {
        const options = this.options();
        if (Object.getOwnPropertyNames(options).length === 0) {
            grunt.fail.fatal("reintegrate requires external config: reintegrate.json");
            return false;
        }

        const optionOutput = {
            gitadd: {},
            gitcommit: {},
            gitcheckout: {},
            gitreset: {},
            gitmerge: {},
        };

        let runMerge = false;
        for (const subdir in options) {
            optionOutput.gitadd[subdir] = {
                options: {
                    cwd: subdir,
                    all: true,
                }
            };
            optionOutput.gitcommit[subdir] = {
                options: {
                    cwd: subdir,
                    message: 'reintegrate ' + subdir + ' before branching to ' + branch,
                    allowEmpty: true,
                }
            };
            optionOutput.gitcheckout[subdir] = {
                options: {
                    cwd: subdir,
                    branch: branch,
                    overwrite: true,
                }
            };
            optionOutput.gitreset[subdir] = {
                options: {
                    cwd: subdir,
                    mode: 'hard',
                    commit: options[subdir].reset,
                }
            };

            if (targetOption !== "clean" && options[subdir].merge) {
                for (const merge of options[subdir].merge) {
                    runMerge = true;
                    const key = subdir + "-" + merge;
                    optionOutput.gitmerge[key] = {
                        options: {
                            cwd: subdir,
                            branch: merge,
                        }
                    }
                }
            }
        }

        for (const task in optionOutput) {
            grunt.config(task, optionOutput[task]);
        }

        grunt.task.run([
            'gitadd', // add loose files
            'gitcommit', // commit changes
            'gitcheckout', // create new branch
            'gitreset', // reset hard to base branch
        ]);

        if (runMerge) {
            grunt.task.run(['gitmerge']); // merge features
        }
    });
};
