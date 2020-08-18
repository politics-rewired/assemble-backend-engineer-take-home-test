# Assemble Backend Engineer Take Home Assignment

Assemble is an browser based spreadsheet app built largely in `pl/pgsql` via triggers.
The goal of this test is to introduce you to database oriented programming and guage
your ability to solve a non-trivial but not too complex problem.

For a quick introduction to database oriented programming, check out
[this blog post](https://pgdash.io/blog/postgres-server-side-programming.html).
For a quick introduction to why you'd want to do this, check out [this talk](https://www.youtube.com/watch?v=XDOrhTXd4pE).

This assignment should be possible only using triggers which call user defined `pl/pgsql` functions.

## Getting Started

1. Get PostgreSQL up and running.
   In order to run the migrations and tests, you'll need Postgresql running locally on 5432. If you'd like to use a remote Postgres or local postgres running on a different port, just set `export DATABASE_URL=<your database url>`.

2. Create the database to run the tests.
   For me, the easiest way to do this is to pop into `psql`:

```
MacBook-Pro-5:assemble-backend-engineer-take-home benpacker$ psql
psql (12.2, server 11.8)
Type "help" for help.

benpacker=# create database assemble_test;
CREATE DATABASE
```

From there, you can run:

```
yarn migrate:up
yarn migrate:down
```

And

```
yarn test
```

## The Task

### Background

This repo contains a simple reproduction of one component of a messaging application. In this application,
(not included here), sending messages is accomplished by inserts to the `outbound_messages` table, which then,
via triggers, queue the sending of the message.

Each user of the application has an entry in the `profiles` table.

When a message is sent, we later receive a delivery report via a webhook. This delivery report will contain
an event - in this case, simplified to `'delivered' | 'failed'`, and if it's `failed`, there will also be
an associated error code, here simplified to either `30007` (flagged as spam) or `21610`
(failed to send because the contact was opted out).

This `21610` error is the one we're focusing on here. It occurs when a message is sent from a specific profile to
a phone number that has already opted out from messages from that specific profile.

Right now, in our application, we let other profiles message that phone number, and we would
like to continue to do so. However, if a specific phone number opts out from messages from _three distinct profiles_,
we would like to prevent messages from being sent to this number at all in the future.

### Goal

To get started, take a look at the tests in `__tests__/assignment.spec.ts`. The behavior described above is described in
the test. If you run `yarn test`, you can tell that one test is failing. Your goal is to make all tests pass!

To do this, you should not _need_ to modify any code in `assignment.spec.ts` or write any Javascript - we'd like you to find a
solution that relies on the features provided by PostgreSQL itself.

To verify that the failing test is working properly, you can uncomment the provided test cheat in the second migration file.
This cheat relies on a specific body being passed in and is not a proper, general, solution, but it is provided to test
the test as well as provide an example for how to trigger the specific error that we're looking for.

If you'd like to write any additional tests in `assignment.spec.ts` (or create another test file) to test
intermediate components of your solution, feel free to do so.

For extra credit, make sure that your indexes and table structure are designed so that checking to see if a contact
is triple-opted-out is virtually instant even if there are a hundred million messages, tens of millions of
received `21610`s, and several million contacts who have triple-opted-out.
