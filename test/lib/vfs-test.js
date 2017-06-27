const tap = require('tap')
const Path = require('path')
const async = require('async')
const vfsFile = require('@kba/vfs-file')

const testFunctions = module.exports = {
    vfsReadTest(t, fs, cb) {
        const testFileContents = 'ÜÄ✓✗\n'
        const testFilePath = '/lib/file2.txt'
        fs.once('sync', () => async.waterfall([
            cb => t.test('stat', t => {
                t.equals(fs.constructor.capabilities.has('stat'), true, 'implements stat')
                fs.stat(testFilePath, (err, node) => {
                    t.deepEquals(err, undefined, 'no error')
                    t.equals(node.size, 11, '11 bytes long')
                    t.equals(node.isDirectory, false, 'not a Directory')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('readdir', (t) => {
                fs.readdir('/lib', (err, files) => {
                    t.equals(files.length, 3, '3 files in /lib')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('getdir', (t) => {
                fs.getdir('/lib', (err, files) => {
                    t.equals(files.length, 3, '3 files in /lib')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('getdir {sortBy:mtime, sortDir: 1}', (t) => {
                fs.getdir('/lib', {sortBy: 'mtime', sortDir: 1}, (err, files) => {
                    t.equals(files[0].mtime.getTime() < files[2].mtime.getTime(), true, '0 < 2')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('getdir {sortBy:mtime, sortDir: -1}', (t) => {
                fs.getdir('/lib', {sortBy: 'mtime', sortDir: -1}, (err, files) => {
                    t.equals(files[0].mtime.getTime() > files[2].mtime.getTime(), true, '0 > 2')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('find', (t) => {
                fs.find('/', (err, files) => {
                    t.notOk(err, 'no error')
                    t.equals(files.length, 4, '4 files in the fs')
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('createReadStream', t =>{
                if (!(fs.constructor.capabilities.has('createReadStream'))) {
                    t.comment('Not implemented')
                    t.end()
                    return cb()
                }
                const stream = fs.createReadStream(testFilePath)
                stream.on('data', (data) => t.equals(data.toString(), testFileContents))
                stream.on('end', () => {
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('readFile/string', t => {
                fs.readFile(testFilePath, {encoding:'utf8'}, (err, buf) => {
                    t.deepEquals(err, undefined, 'no error')
                    t.equals(buf, testFileContents)
                    t.end()
                    return cb()
                })
            }),
            cb => t.test('readFile/Buffer', t => {
                fs.readFile(testFilePath, (err, buf) => {
                    t.deepEquals(err, undefined, 'no error')
                    t.deepEquals(buf, new Buffer(testFileContents))
                    t.end()
                    return cb()
                })
            }),
            cb => cb(),
            // cb => t.test('writeFile', t => {
            //     vfs.writeFile(dummyPath, dummyData, (err) => {
            //         t.deepEquals(err, undefined, 'writeFile/String: no error')
            //         t.end()
            //         return cb()
            //     })
            // }),
            // cb => t.test('readFile/string', t => {
            //     vfs.readFile(dummyPath, {encoding: 'utf8'}, (err, data) => {
            //         t.deepEquals(err, undefined, 'readFile/string: no error')
            //         t.equals(typeof data, 'string', 'is a string')
            //         t.equals(data.length, dummyData.length, `${dummyData.length} characters long`)
            //         t.end()
            //         return cb()
            //     })
            // }),
            // cb => t.test('copyFile(string, {vfs:fs, path: /tmp/foo})', t => {
            //     vfs.copyFile(dummyPath, {vfs: fs, path: '/tmp/foo'}, (err) => {
            //         t.notOk(err, 'no error')
            //         t.end()
            //         return cb()
            //     })
            // }),
            // cb => t.test('unlink', t => {
            //     vfs.unlink(dummyPath, (err) => {
            //         t.deepEquals(err, undefined, 'unlink: no error')
            //         t.end()
            //         return cb()
            //     })
            // }),
            // cb => t.test('stat after unlink', t => {
            //     vfs.stat(dummyPath, (err, x) => {
            //         t.ok(err.message.match('NoSuchFileError'), 'stat fails after delete')
            //         t.end()
            //         return cb()
            //     })
            // }),
        ], cb))
        fs.init()
    }
}

testFunctions.testVfs = function(vfsName, tests) {
    const fileVfs = new vfsFile()
    tap.test(`${vfsName} vfs`, t => {
        const vfsClass = require(`@kba/vfs-${vfsName}`)
        t.equals(vfsClass.scheme, vfsName, `scheme is ${vfsName}`)
        const runTests = (options, fns, done) => {
            fns.forEach(fn => {
                testFunctions[fn](t, new(vfsClass)(options), err => {
                    if (err) return done(err)
                    return done()
                })
            })
        }
        async.eachSeries(tests, ([options, fns], done) => {
            if ('location' in options) {
                const fixtureName = Path.join(__dirname, '..', 'fixtures', options.location)
                fileVfs.stat(fixtureName, (err, location) => {
                    if (err) throw err
                    t.notOk(err, `read ${fixtureName}`)
                    options.location = location
                    runTests(options, fns, done)
                })
            } else {
                runTests(options, fns, done)
            }
        }, (err) => {
            if (err) t.fail(":-(")
            t.end()
        })
    })
}

