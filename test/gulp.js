import '../src'
import bufferEqual from 'buffer-equal'
import gulp from 'gulp'
import rump from 'rump'
import timeout from 'timeout-then'
import {colors} from 'gulp-util'
import {readFile, writeFile} from 'mz/fs'
import {sep} from 'path'
import {spy} from 'sinon'

const {stripColor} = colors

describe('tasks', function() {
  this.timeout(0)

  afterEach(() => {
    rump.configure({paths: {
      source: {root: 'test/fixtures', static: ''},
      destination: {root: 'tmp'},
    }})
  })

  it('are added and defined', () => {
    const callback = spy()
    rump.on('gulp:main', callback)
    rump.on('gulp:static', callback)
    rump.addGulpTasks({prefix: 'spec'})
    callback.should.be.calledTwice()
    gulp.tasks['spec:info:static'].should.be.ok()
    gulp.tasks['spec:build:static'].should.be.ok()
    gulp.tasks['spec:watch:static'].should.be.ok()
  })

  it('display correct information in info task', () => {
    const logs = [],
          {log} = console
    console.log = newLog
    gulp.start('spec:info')
    console.log = log
    logs.slice(-6).should.eql([
      '',
      '--- Static v0.8.0',
      `Static files from test${sep}fixtures are copied to tmp`,
      'Affected files:',
      'index.html',
      '',
    ])
    rump.reconfigure({paths: {source: {static: 'nonexistant'}}})
    logs.length = 0
    console.log = newLog
    gulp.start('spec:info')
    console.log = log
    logs.length.should.not.be.above(4)

    function newLog(...args) {
      logs.push(stripColor(args.join(' ')))
    }
  })

  it('for building', async() => {
    const original = await readFile('test/fixtures/index.html')
    await new Promise(resolve => {
      gulp.task('postbuild', ['spec:build'], resolve)
      gulp.start('postbuild')
    })
    bufferEqual(original, await readFile('tmp/index.html')).should.be.true()
  })

  describe('for watching', () => {
    let original

    before(async() => {
      original = await readFile('test/fixtures/index.html')
      await new Promise(resolve => {
        gulp.task('postwatch', ['spec:watch'], resolve)
        gulp.start('postwatch')
      })
    })

    beforeEach(() => timeout(1000))

    afterEach(() => writeFile('test/fixtures/index.html', original))

    it('handles updates', async() => {
      bufferEqual(original, await readFile('tmp/index.html')).should.be.true()
      await writeFile('test/fixtures/index.html', '<h1>New</h1>')
      await timeout(1000)
      bufferEqual(original, await readFile('tmp/index.html')).should.be.false()
    })
  })
})
