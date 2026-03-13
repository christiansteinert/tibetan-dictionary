/**
 * ClearButton – clears the search input field.
 *
 * Uses CSS ::before pseudo-element for the icon (defined in index.css).
 * Must be placed as the immediate sibling after #searchTerm inside
 * .textInputWrap so the CSS selector `#searchTerm:not(:placeholder-shown) + .clear-input`
 * can show/hide it based on input content.
 */
interface Props {
  onClick: () => void;
}

export default function ClearButton({ onClick }: Props) {
  return (
    <button
      id="clearInputBtn"
      className="clear-input"
      type="button"
      title="Clear input"
      aria-label="Clear input"
      onClick={onClick}
    />
  );
}
