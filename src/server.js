import winston from 'winston'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import pm2 from 'pm2'
import git from 'simple-git'
import { exec } from 'child_process'

import WebhookCatcher from './webhook-catcher'


if (process.env.NODE_ENV !== 'production') {
  try {
    dotenv.config()
  } catch (err) {
    winston.log('error', err)
    process.exit(2)
  }
}

let config = null

try {
  config = yaml.safeLoad(fs.readFileSync(__dirname + '/../config.yaml', 'utf8'))
} catch (err) {
  winston.log('error', err)
  process.exit(2)
}

console.log(config)

let catcher = new WebhookCatcher(config)

catcher.on('webhook', ({ app }) => {
  winston.info('reploy', app.name)

  let repositoryPath = path.join(__dirname, '../', config.base, app.path ? app.path : app.name)

  let repository = git(repositoryPath)

  repository
  .raw([
      'config',
      '--local',
      'core.sshCommand',
      '/usr/bin/ssh -i ' + path.join(__dirname, '../', config.bitbucket_ssh_key)
  ])
  .pull((err) => {
    if (err) {
      winston.log('error', err)
    } else {
      exec('cd ' + repositoryPath + ' && npm install && npm run build && pm2 restart '+app.name, (error, stdout, stderr) => {
        if (error) {
          winston.log('error', err, stdout, stderr)
        } else {
          /*pm2.connect((err) => {
            if (err) {
              winston.log('error', err)
              process.exit(2)
            }

            pm2.start({
              name: app.name
            }, (err, apps) => {
              pm2.disconnect()
              if (err) {
                winston.log('error', err)
              } else {
                winston.info('app ' + app.name + ' reployed')
              }
            })
          })*/
          winston.info('app ' + app.name + ' reployed')
        }
      })
    }
  })

  // console.log('git pull')
  // console.log('npm install')
  // console.log('pm2 restart')





})
