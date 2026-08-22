---
stage: Software Supply Chain Security
group: Authentication
info: To determine the technical writer assigned to the Stage/Group associated with this page, see <https://handbook.gitlab.com/handbook/product/ux/technical-writing/#assignments>
title: Sign in to GitLab
description: Sign in with account credentials, passkeys, or authentication methods configured for a GitLab instance.
ignore_in_report: true
---

{{< details >}}

- Tier: Free, Premium, Ultimate
- Offering: GitLab.com, GitLab Self-Managed, GitLab Dedicated

{{< /details >}}

The sign-in page presents your GitLab instance branding beside the available authentication methods.
The page adapts to narrow screens and uses the color mode selected for the instance.

## Sign in with a username and password

To sign in with account credentials:

1. Enter your username or primary email address.
1. Enter your password.
1. Optional. Select **Remember me** when the instance permits persistent sessions.
1. Select **Sign in**.

When two-step sign-in is active, enter your username or primary email address first and select
**Continue**.
GitLab then displays the password field or routes the request to the correct GitLab cell.

If you cannot remember your password, select **Forgot your password?**.
For more information, see [Change your password](user_passwords.md).

## Sign in with another method

The page displays only authentication methods configured by the instance administrator.
Depending on the instance, these methods can include:

- A passkey
- Lightweight Directory Access Protocol (LDAP)
- Crowd
- Smart card authentication
- OAuth 2.0 or OpenID Connect providers
- Security Assertion Markup Language (SAML) single sign-on

Provider-specific fields and buttons submit to the configured authentication route.
For more information about instance authentication, see
[Authentication and authorization](../../administration/auth/_index.md).

## Create an account

When registration is active, select **Register now**.
An invitation email address remains prefilled when the invitation supplies one.

For more information, see [Create an account](account/create_accounts.md).

## Sign-in page customization

Instance administrators can change the brand image, title, and descriptive text shown on the
sign-in page.
The authentication controls and routes remain unchanged by these appearance settings.

For more information, see
[Customize your sign-in and register pages](../../administration/appearance.md#customize-your-sign-in-and-register-pages).

## Troubleshooting

If the page reports that no authentication methods are configured, contact the instance
administrator.
The instance must provide at least one password, LDAP, or external provider route before you can
sign in.

If GitLab rejects your credentials, confirm that you selected the correct configured method.
Use the password recovery link for a standard account, or contact the administrator responsible for
the external identity provider.

Captcha challenges can appear after repeated unsuccessful attempts or when the instance requires
them.
Complete the challenge before you submit the form again.
