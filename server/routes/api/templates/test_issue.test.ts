import { UserMembership } from "@server/models";
import {
  buildViewer,
  buildCollection,
} from "@server/test/factories";
import { CollectionPermission } from "@shared/types";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("viewer with collection admin can edit templates", () => {
  it("should return update:true policy after viewer creates a template in their managed collection", async () => {
    // Create a workspace viewer
    const viewer = await buildViewer();
    
    // Create a collection with permission: null (private/restricted)
    const collection = await buildCollection({
      teamId: viewer.teamId,
      permission: null,
    });
    
    // Give the viewer Admin (Manager) collection membership
    await UserMembership.create({
      createdById: viewer.id,
      collectionId: collection.id,
      userId: viewer.id,
      permission: CollectionPermission.Admin,
    });
    
    // Create a template via the API (as the viewer)
    const createRes = await server.post("/api/templates.create", {
      body: {
        token: viewer.getJwtToken(),
        collectionId: collection.id,
        title: "My Template",
      },
    });
    
    const createBody = await createRes.json();
    console.log("Create Status:", createRes.status);
    console.log("Create Policies:", JSON.stringify(createBody.policies, null, 2));
    
    expect(createRes.status).toEqual(200);
    
    const templateId = createBody.data.id;
    const policy = createBody.policies?.find((p: {id: string}) => p.id === templateId);
    console.log("Template policy after create:", JSON.stringify(policy, null, 2));
    
    // The template should be editable by the creator (viewer + collection manager)
    expect(policy?.abilities?.update).toBeTruthy();
  });

  it("should allow viewer to create a template via templates.create if they have collection admin", async () => {
    const viewer = await buildViewer();
    
    const collection = await buildCollection({
      teamId: viewer.teamId,
      permission: null,
    });
    
    await UserMembership.create({
      createdById: viewer.id,
      collectionId: collection.id,
      userId: viewer.id,
      permission: CollectionPermission.Admin,
    });
    
    const createRes = await server.post("/api/templates.create", {
      body: {
        token: viewer.getJwtToken(),
        collectionId: collection.id,
        title: "Viewer Template",
      },
    });
    
    console.log("Status:", createRes.status);
    expect(createRes.status).toEqual(200);
  });
  
  it("should NOT allow viewer to create a template without collection admin", async () => {
    const viewer = await buildViewer();
    
    const collection = await buildCollection({
      teamId: viewer.teamId,
      permission: CollectionPermission.ReadWrite, // public collection
    });
    
    const createRes = await server.post("/api/templates.create", {
      body: {
        token: viewer.getJwtToken(),
        collectionId: collection.id,
        title: "Viewer Template",
      },
    });
    
    console.log("Status:", createRes.status);
    expect(createRes.status).toEqual(403);
  });
});
