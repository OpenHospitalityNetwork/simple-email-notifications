import * as css from '@solid/community-server'
import { expect } from 'chai'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { describe } from 'mocha'
import app from '../app'
import { getAuthenticatedFetch } from '../helpers'

describe('Mailer integration via /inbox', () => {
  let server: Server<typeof IncomingMessage, typeof ServerResponse>
  let authenticatedFetch: typeof fetch
  let cssServer: css.App

  before(async function () {
    this.timeout(20000)
    // Community Solid Server (CSS) set up following example in https://github.com/CommunitySolidServer/hello-world-component/blob/main/test/integration/Server.test.ts
    cssServer = await new css.AppRunner().create(
      {
        mainModulePath: css.joinFilePath(__dirname, '../../'), // ?
        typeChecking: false, // ?
        dumpErrorState: false, // disable CSS error dump
      },
      css.joinFilePath(__dirname, './css-default-config.json'), // CSS config
      {},
      // CSS cli options
      // https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main#-parameters
      {
        port: 3456,
        loggingLevel: 'off',
        seededPodConfigJson: css.joinFilePath(__dirname, './css-pod-seed.json'), // set up some Solid accounts
      },
    )
    await cssServer.start()

    authenticatedFetch = await getAuthenticatedFetch({
      email: 'person@example',
      password: 'password',
      solidServer: 'http://localhost:3456',
    })
  })
  after(async () => {
    await cssServer.stop()
  })

  before(done => {
    server = app.listen(3005, done)
  })
  after(done => {
    server.close(done)
  })

  it('should be able to receive integration request to inbox', async () => {
    const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
      method: 'post',
      headers: {
        'content-type':
          'application/ld+json;profile="https://www.w3.org/ns/activitystreams"',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@id': '',
        '@type': 'Add',
        actor: 'http://localhost:3456/person/profile/card#me',
        object: 'http://localhost:3456/person/inbox/',
        target: 'email@example.com',
      }),
    })

    expect(response.status).to.equal(200)
  })

  context('person not signed in', () => {
    it('should respond with 401', async () => {
      const response = await fetch(`http://localhost:3005/inbox`, {
        method: 'post',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          '@id': '',
          '@type': 'Add',
          actor: 'http://localhost:3456/person/profile/card#me',
          object: 'http://localhost:3456/person/inbox/',
          target: 'email@example.com',
        }),
      })

      expect(response.status).to.equal(401)
    })
  })

  context("authenticated person and actor don't match", () => {
    it('should respond with 403', async () => {
      const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
        method: 'post',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          '@id': '',
          '@type': 'Add',
          actor: 'http://localhost:3456/person2/profile/card#me',
          object: 'http://localhost:3456/person/inbox/',
          target: 'email2@example.com',
        }),
      })

      expect(response.status).to.equal(403)
    })
  })

  it('should check that the person requesting is the authenticated person', async () => {
    const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify({}),
    })

    expect(response.status).to.equal(403)
  })

  it(
    'should check that the inbox belongs to the person requesting subscription',
  )

  it('should check that it can read the inbox')

  it('should send email with verification link')
})