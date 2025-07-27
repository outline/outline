# 🚨 HIGH PRIORITY: Bug #9097 - Authentication Migration Issue

## Quick Start Guide

### **Why This Bug is Critical**
- **Users lose access** to their accounts after auth provider changes
- **Data loss risk** - users can't access their documents
- **Security implications** - authentication system compromised
- **High user impact** - affects entire teams

### **Bug Summary**
When switching from OIDC to GitLab authentication, existing users with identical emails and user IDs cannot be matched correctly. Outline creates new accounts instead of linking to existing ones.

### **Investigation Steps**

#### **1. Reproduce the Issue**
```bash
# Set up test environment
# 1. Configure OIDC authentication
# 2. Create user accounts via OIDC
# 3. Switch to GitLab authentication
# 4. Try logging in with same email via GitLab
# 5. Verify new account is created instead of mapping to existing
```

#### **2. Key Files to Investigate**
- `server/commands/teamProvisioner.ts` - User provisioning logic
- `server/models/User.ts` - User model and authentication
- `server/middlewares/authentication.ts` - Auth middleware
- `server/models/AuthenticationProvider.ts` - Auth provider handling

#### **3. Root Cause Analysis**
The issue likely stems from:
- User matching logic in `teamProvisioner.ts`
- Authentication provider ID vs email matching
- Migration logic when switching auth providers

#### **4. Potential Fix Areas**
```typescript
// Look for user matching logic like:
const existingUser = await User.findOne({
  where: {
    email: userEmail,
    // This might be the issue - should also check by email
    authenticationProviderId: providerId
  }
});
```

#### **5. Testing Strategy**
- [ ] Test with OIDC → GitLab migration
- [ ] Test with GitLab → OIDC migration  
- [ ] Test with other auth provider combinations
- [ ] Verify existing user data is preserved
- [ ] Test edge cases (multiple emails, different domains)

### **Expected Outcome**
Users should be able to:
1. Switch authentication providers seamlessly
2. Access their existing accounts with same email
3. Maintain all their documents and permissions
4. Not have duplicate accounts created

### **Success Criteria**
- [ ] User migration works in both directions
- [ ] No duplicate accounts created
- [ ] All user data preserved
- [ ] Permissions maintained
- [ ] Comprehensive tests added

### **Next Steps**
1. **Clone the repo** and set up development environment
2. **Reproduce the issue** following steps above
3. **Investigate the code** in the key files listed
4. **Implement fix** with proper user matching logic
5. **Add tests** to prevent regression
6. **Submit PR** with comprehensive documentation

---

**Priority**: HIGH
**Estimated Effort**: 2-3 days
**Risk**: High (affects user access)
**Dependencies**: None

*Start here - this is the most critical bug affecting user access and data security.* 