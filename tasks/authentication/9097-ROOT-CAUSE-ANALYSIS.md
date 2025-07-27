# 🚨 Bug #9097 - Root Cause Analysis

## **The Problem**

When switching from OIDC to GitLab authentication, existing users with identical emails cannot be matched correctly. Outline creates new accounts instead of linking to existing ones.

## **Root Cause Analysis**

### **Current User Matching Logic**

The issue is in `server/commands/userProvisioner.ts`. Here's the problematic flow:

1. **First Check**: Look for existing authentication by `providerId` only
   ```typescript
   const auth = authentication
     ? await UserAuthentication.findOne({
         where: {
           providerId: String(authentication.providerId), // ❌ Only checks providerId
         },
         include: [
           {
             model: User,
             as: "user",
             where: { teamId },
             required: true,
           },
         ],
       })
     : undefined;
   ```

2. **Second Check**: Look for existing user by email only
   ```typescript
   const existingUser = await User.scope([
     "withAuthentications",
     "withTeam",
   ]).findOne({
     where: {
       email: email.toLowerCase(),
       teamId,
     },
   });
   ```

### **The Problem**

When switching from OIDC to GitLab:

1. **User exists** with email `user@example.com` and OIDC `providerId: "123"`
2. **New login attempt** with GitLab `providerId: "456"` and same email `user@example.com`
3. **First check fails** - no UserAuthentication with `providerId: "456"`
4. **Second check succeeds** - finds user by email
5. **But then** - the code creates a NEW authentication record instead of linking to existing user properly

### **The Specific Issue**

In lines 158-175 of `userProvisioner.ts`:

```typescript
// We have an existing user, so we need to update it with our
// new details and count this as a new user creation.
if (existingUser) {
  // ... existing user logic ...
  
  // Only need to associate the authentication with the user if there is one.
  if (!authentication) {
    return null;
  }

  return await existingUser.$create<UserAuthentication>(
    "authentication",
    authentication, // ❌ This creates a NEW authentication record
    {
      transaction,
    }
  );
}
```

**The problem**: When a user switches auth providers, the system correctly finds the existing user by email, but then creates a NEW authentication record instead of properly handling the migration.

### **Expected Behavior**

When a user logs in with a new auth provider but same email:
1. Find existing user by email ✅
2. **Link the new authentication to the existing user** ✅
3. **Don't create duplicate accounts** ✅

### **Current Behavior**

When a user logs in with a new auth provider but same email:
1. Find existing user by email ✅
2. **Create NEW authentication record** ❌
3. **This can lead to confusion and potential issues** ❌

## **The Fix**

The issue is that the code correctly finds the existing user by email, but the logic for handling authentication provider migration is incomplete. The fix should:

1. **Check if user already has authentication from different provider**
2. **Handle the migration gracefully**
3. **Ensure no duplicate authentications are created**

### **Proposed Solution**

Modify the `userProvisioner.ts` to:

1. **Add a check** for existing authentications with different providers
2. **Handle migration** by updating the existing authentication or creating a new one properly
3. **Add logging** to track authentication provider migrations
4. **Add tests** to prevent regression

### **Key Files to Modify**

1. `server/commands/userProvisioner.ts` - Main fix
2. `server/commands/userProvisioner.test.ts` - Add migration tests
3. `server/models/UserAuthentication.ts` - Ensure proper constraints

### **Testing Strategy**

1. **Test OIDC → GitLab migration**
2. **Test GitLab → OIDC migration**
3. **Test multiple provider switches**
4. **Verify no duplicate accounts created**
5. **Verify user data preserved**

---

**Status**: Ready for implementation
**Priority**: HIGH
**Estimated Effort**: 1-2 days
**Risk**: Medium (affects authentication system) 