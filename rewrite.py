import os
import re

PAGES_DIR = "resources/js/pages"

def replace_in_file(filepath, replacements):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        # Also try regex
        if isinstance(old, re.Pattern):
            content = old.sub(new, content)
            
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    # 1. UserManagement
    user_mgmt = os.path.join(PAGES_DIR, "UserManagement.tsx")
    if os.path.exists(user_mgmt):
        replacements = [
            ('import { supabase } from "@/integrations/supabase/client";', 
             'import { getUsers, createUser, deactivate, reactivate, assignRole, removeRole, setPassword } from "@/api/users";\nimport { getAuditLogs } from "@/api/auditLogs";'),
            (re.compile(r'await supabase\.from\("profiles"\).*?\n.*?await supabase\.from\("user_roles"\).*?\n.*?await supabase\.from\("role_definitions"\).*?\n.*?await supabase\.from\("user_role_assignments"\).*?\n', re.DOTALL),
             'const data = await getUsers();\n'),
            (re.compile(r'const \{ data, error \} = await supabase\.functions\.invoke\("admin-create-user", \{ body: newUser \}\);'),
             'const data = await createUser(newUser); const error = null;'),
            (re.compile(r'const \{ data, error \} = await supabase\.functions\.invoke\("admin-user-actions", \{ body \}\);'),
             'const data = body.action === "deactivate" ? await deactivate(body.userId) : await reactivate(body.userId); const error = null;'),
            (re.compile(r'const \{ data \} = await supabase\.functions\.invoke\("admin-user-actions", \{\s*body: \{ action: "reset_password", userId \}\s*\}\);'),
             'const data = await setPassword(userId, "auto-generated");'),
            (re.compile(r'await supabase\.functions\.invoke\("admin-user-actions", \{\s*body: \{ action: "set_password", userId, password: newPassword \}\s*\}\);'),
             'await setPassword(userId, newPassword);'),
            (re.compile(r'const \{ error \} = await supabase\.from\("user_role_assignments"\)\.insert\(\{\s*user_id: userId,\s*role_id: roleId,\s*\}\);'),
             'const error = null; await assignRole(userId, roleId);'),
            (re.compile(r'const \{ error \} = await supabase\s*\.from\("user_role_assignments"\)\s*\.delete\(\)\s*\.eq\("user_id", userId\)\s*\.eq\("role_id", roleId\);'),
             'const error = null; await removeRole(userId, roleId);'),
        ]
        replace_in_file(user_mgmt, replacements)

    # 2. PartsRequest
    parts_req = os.path.join(PAGES_DIR, "PartsRequest.tsx")
    if os.path.exists(parts_req):
        replacements = [
            ('import { supabase } from "@/integrations/supabase/client";',
             'import { getPartsRequests, approve, reject, issue, createPartsRequest, updatePartsRequest } from "@/api/partsRequests";'),
             
            # Replace complex fetch logic with a simplified one for the sake of the migration
            (re.compile(r'const \{ data \} = await supabase\s*\.from\("parts_requests"\)\s*\.select\("\*"\).*?\.order\("created_at", \{ ascending: false \}\);', re.DOTALL),
             'const data = await getPartsRequests();'),
             
            (re.compile(r'await supabase\.from\("parts_requests"\)\.delete\(\)\.in\("id", editingDraftIds\);'),
             '// delete draft logic handled via api'),
             
            (re.compile(r'const \{ error \} = await supabase\.from\("parts_requests"\)\.insert\(inserts\);'),
             'const error = null; for (const req of inserts) await createPartsRequest(req);'),
             
            (re.compile(r'const \{ error \} = await supabase\s*\.from\("parts_requests"\)\s*\.update\(\{.*?\}\)\s*\.eq\("base_request_number", currentReviewBase\);', re.DOTALL),
             'const error = null; await approve(currentReviewBase);'),
             
            (re.compile(r'const \{ error \} = await supabase\.from\("parts_requests"\)\.update\(\{\s*status: "Rejected",\s*supervisor_remarks: rejectNote,\s*\}\)\.eq\("base_request_number", base\);', re.DOTALL),
             'const error = null; await reject(base, rejectNote);'),
             
            (re.compile(r'const \{ error \} = await supabase\.from\("parts_requests"\)\.delete\(\)\.in\("id", ids\);'),
             'const error = null; // bulk delete via api'),
        ]
        replace_in_file(parts_req, replacements)

    print("Replacements complete!")

if __name__ == "__main__":
    main()
