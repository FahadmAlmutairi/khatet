// The Khatet خ mark (Figma "Logo / Khatet mark", 1090:13752), shown alone top left on every screen.
// An empty label hides it from screen readers when a button around it already has a name.
export default function Logo({ size = 32, label = 'Khatet' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path d="M14 26H40L22 40C18 44 22 52 30 52H50" stroke="#263629" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M27 16.5C30.0376 16.5 32.5 14.0376 32.5 11C32.5 7.96243 30.0376 5.5 27 5.5C23.9624 5.5 21.5 7.96243 21.5 11C21.5 14.0376 23.9624 16.5 27 16.5Z"
        fill="#C86C4D"
      />
    </svg>
  )
}
