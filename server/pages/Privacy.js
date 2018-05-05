// @flow
import * as React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Content from './components/Content';

export default function Privacy() {
  return (
    <Grid>
      <Helmet>
        <title>Privacy policy</title>
      </Helmet>
      <Header>
        <h1>Privacy policy</h1>
      </Header>
      <Content>
        <p>
          Your privacy is critically important to us. At Outline we have a few
          fundamental principles:
        </p>

        <ul>
          <li>
            We don’t ask you for personal information unless we truly need it.
          </li>
          <li>
            We don’t share your personal information with anyone except to
            comply with the law, develop our products, or protect our rights.
          </li>
          <li>
            We don’t store personal information on our servers unless required
            for the on-going operation of one of our services.
          </li>
        </ul>

        <p>
          If you have questions about deleting or correcting your personal data
          please contact our support team.
        </p>

        <p>
          Outline operates website getoutline.com. It is Outline’s policy to
          respect your privacy regarding any information we may collect while
          operating our websites.
        </p>

        <h3>Website Visitors</h3>
        <p>
          Like most website operators, Outline collects
          non-personally-identifying information of the sort that web browsers
          and servers typically make available, such as the browser type,
          language preference, referring site, and the date and time of each
          visitor request. Outline’s purpose in collecting non-personally
          identifying information is to better understand how Outline’s visitors
          use its website. From time to time, Outline may release
          non-personally-identifying information in the aggregate, e.g., by
          publishing a report on trends in the usage of its website. p> Outline
          also collects potentially personally-identifying information like
          Internet Protocol (IP) addresses for logged in users.
        </p>

        <h3>Gathering of Personally-Identifying Information</h3>

        <p>
          Certain visitors to Outline’s websites choose to interact with Outline
          in ways that require Outline to gather personally-identifying
          information. The amount and type of information that Outline gathers
          depends on the nature of the interaction. For example, we ask visitors
          who sign up to provide an email address or get it with authentication
          partner. Those who engage in transactions with Outline are asked to
          provide additional information, including as necessary the personal
          and financial information required to process those transactions. In
          each case, Outline collects such information only insofar as is
          necessary or appropriate to fulfill the purpose of the visitor’s
          interaction with Outline. Outline does not disclose
          personally-identifying information other than as described below. And
          visitors can always refuse to supply personally-identifying
          information, with the caveat that it may prevent them from engaging in
          certain website-related activities.
        </p>

        <h3>Aggregated Statistics</h3>

        <p>
          Outline may collect statistics about the behavior of visitors to its
          websites. For instance, Outline may monitor the most popular links or
          screen the links help identify spam. Outline may display this
          information publicly or provide it to others. However, Outline does
          not disclose personally-identifying information other than as
          described below.
        </p>

        <h3>Protection of Certain Personally-Identifying Information</h3>

        <p>
          Outline discloses potentially personally-identifying and
          personally-identifying information only to those of its employees,
          contractors and affiliated organizations that (i) need to know that
          information in order to process it on Outline’s behalf or to provide
          services available at Outline’s websites, and (ii) that have agreed
          not to disclose it to others. Some of those employees, contractors and
          affiliated organizations may be located outside of your home country;
          by using Outline’s websites, you consent to the transfer of such
          information to them. Outline will not rent or sell potentially
          personally-identifying and personally-identifying information to
          anyone. Other than to its employees, contractors and affiliated
          organizations, as described above, Outline discloses potentially
          personally-identifying and personally-identifying information only in
          response to a subpoena, court order or other governmental request, or
          when Outline believes in good faith that disclosure is reasonably
          necessary to protect the property or rights of Outline, third parties
          or the public at large.
        </p>
        <p>
          If you are a registered user of an Outline website and have supplied
          your email address, Outline may occasionally send you an email to tell
          you about new features, solicit your feedback, or just keep you up to
          date with what’s going on with Outline and our products. We primarily
          use our various product blogs to communicate this type of information,
          so we expect to keep this type of email to a minimum. If you send us a
          request (for example via a support email or via one of our feedback
          mechanisms), we reserve the right to publish it in order to help us
          clarify or respond to your request or to help us support other users.
          Outline takes all measures reasonably necessary to protect against the
          unauthorized access, use, alteration or destruction of potentially
          personally-identifying and personally-identifying information.
        </p>

        <h3>Cookies</h3>
        <p>
          A cookie is a string of information that a website stores on a
          visitor’s computer, and that the visitor’s browser provides to the
          website each time the visitor returns. Outline uses cookies to help
          Outline identify and track visitors, their usage of Outline website,
          and their website access preferences. Outline visitors who do not wish
          to have cookies placed on their computers should set their browsers to
          refuse cookies before using Outline’s websites, with the drawback that
          certain features of Outline’s websites may not function properly
          without the aid of cookies.
        </p>

        <h3>Business Transfers</h3>
        <p>
          If Outline, or substantially all of its assets, were acquired, or in
          the unlikely event that Outline goes out of business or enters
          bankruptcy, user information would be one of the assets that is
          transferred or acquired by a third party. You acknowledge that such
          transfers may occur, and that any acquirer of Outline may continue to
          use your personal information as set forth in this policy.
        </p>

        <h3>Privacy Policy Changes</h3>
        <p>
          Although most changes are likely to be minor, Outline may change its
          Privacy Policy from time to time, and in Outline’s sole discretion.
          Outline encourages visitors to frequently check this page for any
          changes to its Privacy Policy. Your continued use of this site after
          any change in this Privacy Policy will constitute your acceptance of
          such change.
        </p>

        <hr />
        <p>
          <small>
            CC BY-SA 2.5. Modified from{' '}
            <a href="http://www.automattic.com">Automattic</a> Privacy Policy
          </small>
        </p>
      </Content>
    </Grid>
  );
}
