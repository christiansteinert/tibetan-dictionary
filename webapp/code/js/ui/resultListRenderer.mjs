/**
 * ResultListRenderer - Handles rendering of search results in the sidebar
 * 
 * Responsible for:
 * - Rendering search result rows in the DataTable
 * - Managing pagination display
 * - Highlighting selected items
 * - Managing click handlers for result selection
 */
import { WylieConverter } from '../language-io/wylieConverter.mjs';

export class ResultListRenderer {
  #dataTable = null;
  #$ = null;
  #onTermSelected = null;
  #wylieConverter = null;

  /**
   * @param {object} jQuery - jQuery instance
   * @param {object} callbacks
   * @param {function} callbacks.onTermSelected - Callback when a term is clicked: (wylie, lang) => void
   */
  constructor(jQuery, callbacks) {
    this.#$ = jQuery;
    this.#onTermSelected = callbacks.onTermSelected;
    this.#wylieConverter = new WylieConverter();
  }

  /**
   * Initialize the DataTable. Must be called after DOM is ready.
   * @param {string} selector - jQuery selector for the table element
   */
  initDataTable(selector) {
    this.#dataTable = this.#$(selector).DataTable({
      processing: false,
      deferRender: false,
      pagingType: "simple",
      searching: false,
      ordering: false,
      dom: 't',
      paging: false,
      columns: [{ "title": "Term" }],
      language: {
        emptyTable: " "
      }
    });
  }

  /**
   * Render search results into the result list
   * @param {object} options
   * @param {Array} options.results - Array of result rows from search
   * @param {number} options.offset - Current pagination offset
   * @param {number} options.listSize - Maximum items to display
   * @param {string} options.lang - Current input language ('tib' or 'en')
   * @returns {object} - { hasResults: boolean, resultCount: number }
   */
  renderResults({ results, offset, listSize, lang, useUnicodeTibetan }) {
    const tableRows = [];

    // Build table rows
    for (let i = 0; i < results.length && i < listSize; i++) {
      const term = results[i][0];
      let displayText;
      if (lang === "en") {
        displayText = term;
      } else {
        displayText = useUnicodeTibetan ? this.#wylieConverter.wylieToUni(term) : term;
      }
      tableRows.push([`<a href="#" data-term="${term}">${displayText}</a>`]);
    }

    // Update DataTable
    this.#dataTable.clear();
    this.#$('.leftSideBar').css('display', 'table-cell');

    if (results.length === 0) {
      this.#dataTable.rows.add(tableRows);
      this.#dataTable.draw();
      this.#$('#wordList').off('click');
      this.#$('#wordList,.paginate').hide();
      this.#$('.paginate_info').text('No results found.');
    } else {
      this.#dataTable.rows.add(tableRows);
      this.#dataTable.draw();
      this.#$('#wordList,.paginate,#wordListContainer').show();
      this.#bindClickHandler(lang);
      const endIndex = offset + Math.min(results.length, listSize);
      this.#$('.paginate_info').text(`Showing results ${offset + 1} to ${endIndex}.`);
    }

    return {
      hasResults: results.length > 0,
      resultCount: results.length
    };
  }

  /**
   * Bind click handler to result list items
   * @private
   */
  #bindClickHandler(lang) {
    this.#$('#wordList')
      .off('click')
      .on('click', 'td', (event) => {
        this.#$('.selected').removeClass('selected');
        this.#$(event.currentTarget).addClass('selected');
        const term = this.#$(event.currentTarget).children('a').attr('data-term');
        this.#onTermSelected(term, lang);
        return false;
      });
  }

  /**
   * Highlight a specific term in the result list
   * @param {string} termToHighlight - Term to highlight (in Wylie or display format)
   * @param {string} lang - Current input language
   */
  highlightTerm(termToHighlight, lang) {
    this.#$('.selected').removeClass('selected');
    if (!termToHighlight) return;

    this.#$('#wordList td')
      .filter((index, element) => {
        const listTerm = this.#$(element).find('a').attr('data-term');
        return listTerm === termToHighlight ||
          (lang === "en" && listTerm.toLowerCase() === termToHighlight.toLowerCase());
      })
      .addClass('selected');
  }

  /**
   * Update the pagination button states
   * @param {boolean} disablePrev - Whether to disable the previous button
   * @param {boolean} disableNext - Whether to disable the next button
   */
  updatePaginationButtons(disablePrev, disableNext) {
    this.#$('#wordList_prev').toggleClass("disabled", disablePrev);
    this.#$('#wordList_next').toggleClass("disabled", disableNext);
  }

  /**
   * Find a matching term in the current result list
   * @param {string} searchTerm - Term to find
   * @param {string} lang - Current input language
   * @returns {string|null} - The matching wylie term, or null if not found
   */
  findMatchingTerm(searchTerm, lang) {
    var matchedTerm = null;

    this.#$('#wordList tr td a').each((count, elem) => {
      const term = this.#$(elem).attr('data-term');
      if (term === searchTerm ||
        (lang === "en" && term.toLowerCase() === searchTerm.toLowerCase())) {
        matchedTerm = term;
      }
    });

    return matchedTerm;
  }

  /**
   * Select the first row in the result list visually
   */
  selectFirstRow() {
    this.#$('#wordList tr:first-child').addClass('selected');
  }

  /**
   * Clear the result list display
   */
  clear() {
    if (this.#dataTable) {
      this.#dataTable.clear();
      this.#dataTable.draw();
    }
  }
}
