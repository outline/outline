/* eslint-disable */
import React from 'react';
import Alert from '.';

test('renders default as info', () => {
  snap(<Alert>default</Alert>);
});

test('renders success', () => {
  snap(<Alert success>success</Alert>);
});

test('renders info', () => {
  snap(<Alert info>info</Alert>);
});

test('renders warning', () => {
  snap(<Alert warning>warning</Alert>);
});

test('renders danger', () => {
  snap(<Alert danger>danger</Alert>);
});
