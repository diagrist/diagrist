/** What the editor opens with when the address holds no source: a short sequence diagram written for the editor. */
export const DEFAULT_SOURCE: string = `# Edit on the left, the picture follows on the right.
diagram sequence "Sign in" subtitle="A first diagram"
actor user "User"
participant app ":App"
participant auth ":AuthService"
msg user -> app "open()"
msg app -> auth "login(name, password)"
alt "valid"
  msg auth --> app "token"
  else "invalid"
    msg auth --> app "error"
msg app --> user "page"
`;
