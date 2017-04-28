import React from 'react';
import { Frame } from 'react-keyframes';

const frames = [];
const p = node => frames.push(node);
const E = props => {
  return (
    <Frame duration={props.duration || 300} component="div">
      {props.children}
    </Frame>
  );
};

const line1 = <p>Hi there,</p>;
const line2 = <p>We're excited to share what we’re building.</p>;
const line3 = <p>We <strong>**love**</strong> Markdown,</p>;
const line4 = <p>but we also get that it's not for everyone.</p>;
const line5 = <p>Together with you,</p>;
const line6 = <p>we want to build the best place to</p>;
const line7 = <p>share ideas,</p>;
const line8 = <p>tell stories,</p>;
const line9 = <p>and build knowledge.</p>;
const line10 = <p>We're just getting started.</p>;
const line11 = <p>Welcome to Atlas.</p>;

p(
  <E>
    {line1}
    {line2}
    {line3}
    {line4}
    {line5}
    {line6}
    {line7}
    {line8}
    {line9}
    {line10}
    {line11}
  </E>
);

// Hmms leaving this here for now, would be nice to something

export default frames;
