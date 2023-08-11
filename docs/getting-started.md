---
hide:
  - navigation
---

# Getting started

## Create Solid Web app via template

We created a [template](https://github.com/SolidLabResearch/solid-web-app-template) that 
helps you to get started with a Solid Web app.
It has the following features:

- [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer) to test with pods locally.
- [Comunica](https://comunica.dev/) for querying pods and other data sources.
- [Solid Authentication library](https://github.com/inrupt/solid-client-authn-js)
  for authenticating with an identity provider.
- [webpack](https://webpack.js.org/) to bundle the JavaScript.
- [Cypress](https://www.cypress.io/) to test our app.

We also have a [template](https://github.com/SolidLabResearch/solid-web-app-react-template) that 
uses [React](https://react.dev/).

## Create Solid service via template

We created a [template](https://github.com/SolidLabResearch/solid-service-template) that
helps you to get started with a Solid service.
It has the following features:

- [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer) (CSS) to test with pods locally.
- [Comunica](https://comunica.dev/) for querying pods and other data sources.

We rely on the [Client Credentials](https://communitysolidserver.github.io/CommunitySolidServer/6.x/usage/client-credentials/)
offered by the CSS.
The advantage is that it allows the service to work without user interaction for authentication.
The disadvantage is that it doesn't work with other Solid servers.
This only applies to authentication.
Once authentication is done,
everything else works as expected when you follow the Solid protocol.
When there is a specification on how to do this type of authentication with every Solid server,
we will update this template.

## Try out Solid pods with the SolidLab Pod Playground

We offer a [public instance](https://pod.playground.solidlab.be/) 
of the latest [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer) release.
Users can use this instance to freely test and experiment with Solid pods.
This is useful, for example, for testing or demoing applications.
The pods and data on the instance is removed daily and
there are no guarantees regarding uptime.
Thus, do not use this instance for automated tests and in production.
