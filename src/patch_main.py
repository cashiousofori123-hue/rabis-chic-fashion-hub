import pathlib, sys

path = pathlib.Path(r'c:\Users\H P\Desktop\rabis-chic-fashion-hub\src\App.jsx')
src = path.read_text(encoding='utf-8')

def log(msg):
    sys.stdout.buffer.write((msg + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()

# 1. Add new imports
old_imports = "const TrackOrder = lazy(() => import('./components/TrackOrder'));"
new_imports = (
    "const TrackOrder      = lazy(() => import('./components/TrackOrder'));\n"
    "const Overview        = lazy(() => import('./pages/admin/Overview'));\n"
    "const Products        = lazy(() => import('./pages/admin/Products'));\n"
    "const Orders          = lazy(() => import('./pages/admin/Orders'));\n"
    "const PendingUsers    = lazy(() => import('./pages/admin/PendingUsers'));\n"
    "const ContentManager  = lazy(() => import('./pages/admin/ContentManager'));\n"
    "const ProfilePage     = lazy(() => import('./pages/admin/Profile'));\n"
    "const SettingsPage    = lazy(() => import('./pages/admin/Settings'));\n"
    "const AdminLogin      = lazy(() => import('./pages/admin/AdminLogin'));\n"
    "const AdminLayoutComp = lazy(() => import('./pages/admin/AdminLayout'));\n"
)
if old_imports in src:
    src = src.replace(old_imports, new_imports, 1)
    log("OK imports patched")
else:
    log("FAIL import marker not found")

# 2. Add secret hash state before activeView state
old_nav_state = "  const [activeView, setActiveView] = useState('store'); // 'store', 'tracker', 'lookup', 'about', 'contact', 'admin'"
new_nav_state = (
    "  // Handle secret admin login via URL hash\n"
    "  const SECRET_HASH = '#admin-secret-login-rabis2024';\n"
    "  const [showSecretLogin, setShowSecretLogin] = useState(\n"
    "    () => typeof window !== 'undefined' && window.location.hash === SECRET_HASH\n"
    "  );\n"
    "  useEffect(() => {\n"
    "    const onHash = () => setShowSecretLogin(window.location.hash === SECRET_HASH);\n"
    "    window.addEventListener('hashchange', onHash);\n"
    "    return () => window.removeEventListener('hashchange', onHash);\n"
    "  }, []);\n"
    "\n"
    "  const [activeView, setActiveView] = useState('store'); // 'store', 'tracker', 'lookup', 'about', 'contact', 'admin'\n"
)
if old_nav_state in src:
    src = src.replace(old_nav_state, new_nav_state, 1)
    log("OK secret hash state patched")
else:
    log("FAIL nav state marker not found")

# 3. Hide Sign In button from regular customers
old_signin = (
    "            {!user && authReady && (\n"
    "              <button\n"
    "                onClick={() => setActiveView('admin')}\n"
    "                className=\"px-2.5 md:px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap hover:bg-slate-200\"\n"
    "              >\n"
    "                <i className=\"fa-solid fa-right-to-bracket\"></i> Sign in\n"
    "              </button>\n"
    "            )}\n"
)
new_signin = (
    "            {/* Sign-in hidden from customers; admin uses secret hash URL */}\n"
    "            {!user && authReady && isAdminAccount && (\n"
    "              <button\n"
    "                onClick={() => setActiveView('admin')}\n"
    "                className=\"px-2.5 md:px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap hover:bg-slate-200\"\n"
    "              >\n"
    "                <i className=\"fa-solid fa-right-to-bracket\"></i> Sign in\n"
    "              </button>\n"
    "            )}\n"
)
if old_signin in src:
    src = src.replace(old_signin, new_signin, 1)
    log("OK sign-in button hidden from customers")
else:
    log("FAIL sign-in button marker not found")
    # try to find it
    idx = src.find("!user && authReady")
    log(f"  Found at idx={idx}: {repr(src[idx:idx+200])}")

# 4. Insert secret login overlay + guard fragment in return()
old_return_start = '    <div className="min-h-screen bg-rose-50/40 text-slate-800 font-sans overflow-x-hidden">\n'
new_return_start = (
    '    <div className="min-h-screen bg-rose-50/40 text-slate-800 font-sans overflow-x-hidden">\n'
    '\n'
    '      {/* SECRET ADMIN LOGIN - accessed via #admin-secret-login-rabis2024 */}\n'
    '      {showSecretLogin && (\n'
    '        <Suspense fallback={null}>\n'
    '          <AdminLogin\n'
    '            onSuccess={() => {\n'
    '              window.location.hash = "";\n'
    '              setShowSecretLogin(false);\n'
    '              setActiveView("admin");\n'
    '            }}\n'
    '          />\n'
    '        </Suspense>\n'
    '      )}\n'
    '\n'
    '      {!showSecretLogin && <>\n'
)
old_footer = '    </div>\n  );\n}'
new_footer = '    </>\n    }\n    </div>\n  );\n}'

if old_return_start in src:
    src = src.replace(old_return_start, new_return_start, 1)
    log("OK secret login overlay inserted")
else:
    log("FAIL return div marker not found")

if old_footer in src:
    src = src.replace(old_footer, new_footer, 1)
    log("OK fragment close inserted")
else:
    log("FAIL footer close marker not found")
    idx = src.rfind('  );\n}')
    log(f"  Found at idx={idx}: {repr(src[idx-100:idx+20])}")

# 5. Replace old aside sidebar with AdminLayoutComp
old_aside_comment = '              {/* VERTICAL LEFT SIDEBAR NAV */}\n'
new_aside_comment = (
    '              {/* VERTICAL LEFT SIDEBAR NAV - AdminLayoutComp */}\n'
    '              <Suspense fallback={null}>\n'
    '              <AdminLayoutComp\n'
    '                adminTab={adminTab}\n'
    '                setAdminTab={setAdminTab}\n'
    '                adminProfile={adminProfile}\n'
    '                orders={orders}\n'
    '                messages={messages}\n'
    '                lockAdmin={lockAdmin}\n'
    '                setActiveView={setActiveView}\n'
    '              />\n'
    '              </Suspense>\n'
)
if old_aside_comment in src:
    src = src.replace(old_aside_comment, new_aside_comment, 1)
    log("OK sidebar comment replaced")
else:
    log("FAIL sidebar comment not found")

# Hide the old aside by wrapping it in {false && ...} - find it after the comment
old_aside_open = '              <aside className="md:col-span-1 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm space-y-6">'
new_aside_open = '              {false && <aside className="md:col-span-1 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm space-y-6">'
old_aside_close = '              </aside>\n\n              {/* MAIN CONTENT AREA */}'
new_aside_close = '              </aside>}\n\n              {/* MAIN CONTENT AREA */}'

if old_aside_open in src:
    src = src.replace(old_aside_open, new_aside_open, 1)
    log("OK old aside hidden")
else:
    log("FAIL old aside open not found")

if old_aside_close in src:
    src = src.replace(old_aside_close, new_aside_close, 1)
    log("OK old aside close hidden")
else:
    log("FAIL old aside close not found")

# 6. Add new tab content before end of admin section
# Find the end of the admin section content area
old_end_tabs = (
    '              </section>\n'
    '\n'
    '            </div>\n'
    '            </>\n'
    '          )}\n'
    '        </main>\n'
    '      )}\n'
)
new_end_tabs = (
    '                {/* ADMIN TAB: CONTENT MANAGER */}\n'
    '                {adminTab === "content" && (\n'
    '                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>\n'
    '                    <ContentManager />\n'
    '                  </Suspense>\n'
    '                )}\n'
    '\n'
    '                {/* ADMIN TAB: USERS */}\n'
    '                {adminTab === "users" && (\n'
    '                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>\n'
    '                    <PendingUsers />\n'
    '                  </Suspense>\n'
    '                )}\n'
    '\n'
    '              </section>\n'
    '\n'
    '            </div>\n'
    '            </>\n'
    '          )}\n'
    '        </main>\n'
    '      )}\n'
)

# Count occurrences to be safe
count = src.count(old_end_tabs)
log(f"  old_end_tabs occurrences: {count}")

if count == 1:
    src = src.replace(old_end_tabs, new_end_tabs, 1)
    log("OK new admin tabs inserted")
else:
    # Try a simpler version
    old_end_tabs2 = (
        '              </section>\r\n'
        '\r\n'
        '            </div>\r\n'
        '            </>\r\n'
        '          )}\r\n'
        '        </main>\r\n'
        '      )}\r\n'
    )
    count2 = src.count(old_end_tabs2)
    log(f"  old_end_tabs2 occurrences (CRLF): {count2}")
    if count2 == 1:
        new_end_tabs2 = (
            '                {/* ADMIN TAB: CONTENT MANAGER */}\r\n'
            '                {adminTab === "content" && (\r\n'
            '                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>\r\n'
            '                    <ContentManager />\r\n'
            '                  </Suspense>\r\n'
            '                )}\r\n'
            '\r\n'
            '                {/* ADMIN TAB: USERS */}\r\n'
            '                {adminTab === "users" && (\r\n'
            '                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>\r\n'
            '                    <PendingUsers />\r\n'
            '                  </Suspense>\r\n'
            '                )}\r\n'
            '\r\n'
            '              </section>\r\n'
            '\r\n'
            '            </div>\r\n'
            '            </>\r\n'
            '          )}\r\n'
            '        </main>\r\n'
            '      )}\r\n'
        )
        src = src.replace(old_end_tabs2, new_end_tabs2, 1)
        log("OK new admin tabs inserted (CRLF)")
    else:
        # Find using regex approach
        idx = src.rfind('</section>')
        log(f"  Last </section> at idx={idx}: {repr(src[idx:idx+200])}")

path.write_text(src, encoding='utf-8')
log("DONE - App.jsx patched")
