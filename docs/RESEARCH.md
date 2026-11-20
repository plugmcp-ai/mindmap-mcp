# Why diagrams, and the rules this project follows

This page explains what a mind map is, what the evidence says about why diagrams help, and which design rules in this project come from that evidence. Where the evidence is weak or contested, it says so.

## What a mind map is, and what it is not

A **mind map** puts one idea in the middle and lets branches grow out of it. Tony Buzan, who made the form popular, described it with a set of habits: a central image, thick curved branches that thin out as they go, one keyword per branch, and one color per main branch. Sources differ on the exact list.

It is one of several structures, and each fits a different kind of content:

| Structure | Fits | Why |
|---|---|---|
| Mind map | Exploring one topic | Everything is one step from the centre; nothing is ranked. |
| Logic chart, org chart, outline | A hierarchy, parts of a whole | A strict tree read in one direction. |
| Flowchart | Steps and decisions | Order and branching are the content. |
| Swimlanes | Who does what | The same flow, split by owner, shows handoffs. |
| Fishbone | Causes of one problem | Groups the causes and points them at the effect. |
| Timeline | Events in order | Position on a line is time. |
| Concept map (Novak) | How ideas relate | Every link carries a phrase, so two nodes and a link read as a sentence. |

This is why the tool descriptions tell the AI to pick the structure from what the content is, and why the user can switch with one click. Labelled cross links between any two nodes cover the concept map case.

## What the evidence says

- **Words and pictures together are remembered better than words alone.** This is dual coding (Paivio; [Clark and Paivio, 1991](https://clark.faculty.uwinnipeg.ca/Clark/Publications/1991-Clark&Paivio-DCT&Educ.pdf)). The theory has critics, but the practical finding holds up well.
- **Working memory holds about four chunks**, not the "seven plus or minus two" often quoted ([Cowan, 2001](https://pubmed.ncbi.nlm.nih.gov/11515286/)). A long list overflows it. Grouping turns many items into few chunks.
- **Splitting attention between a picture and separate text costs effort**; text placed on the diagram avoids that ([Kalyuga, Chandler and Sweller, 1999](https://tecfa.unige.ch/tecfa/teaching/methodo/Kalyuga99.pdf)).
- **Some visual features are seen at a glance**, before attention is focused: color, size, position, line length ([Healey and Enns](https://www.csc2.ncsu.edu/faculty/healey/download/tvcg.11.pdf)).
- **Things that are close, alike, or joined by a line are seen as a group** (the Gestalt principles of grouping). This is textbook perception theory.

### How much do maps actually help?

Less than enthusiasts claim, more than nothing, and it depends on what the person does.

- A meta-analysis of 142 comparisons found that learning with concept maps beat other methods by a moderate margin (g = 0.58). **Building a map helped more (g = 0.72) than studying one someone else made (g = 0.43)** ([Schroeder and others, 2018](https://link.springer.com/doi/10.1007/s10648-017-9403-9)).
- Studies of mind mapping in particular report positive effects, but they are fewer and vary a lot from one to the next. One found better recall after a week ([Farrand and others, 2002](https://pubmed.ncbi.nlm.nih.gov/12028392/)); another found no short-term advantage ([D'Antoni and others, 2010](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2949690/)).

The lesson for an AI tool is direct. A diagram the AI hands over, finished, is the weaker case. The stronger case is a diagram the person works on. That is why editing, commenting and the node actions are the centre of this project and not an extra: they turn a picture to look at into something to think with.

## The rules that follow

These are rules of thumb drawn from the findings above. They have not each been tested on their own.

| Rule | Where it lives | From |
|---|---|---|
| 3 to 7 children per node | `visualize` description | Working memory of about four chunks |
| Labels of 1 to 5 words, detail in a note | `visualize` description, 80 character limit | One keyword per branch; text on the diagram |
| About 30 nodes and 3 levels at first | `visualize` description | Working memory; overview first |
| Big diagrams open with deep levels folded | `src/app/App.tsx` | Progressive disclosure |
| One color per top-level branch, kept all the way down | `src/canvas/Canvas.tsx` | Grouping by likeness; color is seen at a glance |
| Branch colors that color-blind people can tell apart | `OKABE_ITO` in `src/themes/types.ts` | Okabe and Ito's palette |
| Color never carries meaning alone | status has a dot and a word; branches also differ by position | Accessibility |
| Branches thick at the centre, thin at the edge | `taper` in `src/canvas/paths.ts` | Size shows importance at a glance |
| The inline card prefers wide layouts | `compact` in `src/layouts/` | Chat cards are short and must not hijack scrolling |
| A new node grows out of its parent | `src/canvas/useTween.ts` | Motion that shows where something came from |
| Layout changes take about 280 ms and ease out | `MOVE_MS` in `src/canvas/useTween.ts` | Long enough to follow, short enough not to wait |
| No motion when the system asks for less | `prefersReducedMotion` | WCAG 2.3.3 |
| Every structure can be reached and used from the keyboard | `src/canvas/Canvas.tsx` | WCAG 2.1.1 |
| The user can always act on the diagram | `src/feedback/channel.ts` | Building beats viewing |

## What others do well

- **XMind** offers many structures for the same map and lets you switch between them. This project copies that idea.
- **Whimsical** makes building a map fast from the keyboard: Tab for a child, Enter for a sibling. This project uses the same keys.
- **Markmap** treats text as the source and the drawing as a view of it. Here the document is the source, and every structure is a view.
- **Excalidraw's MCP App** showed that drawing while the model is still writing feels alive. This project streams too, but sends structure where Excalidraw sends shapes.

## Open questions

- Does a diagram the AI draws and the person then edits get close to the benefit of building one from nothing? The studies above did not test that.
- Which structure should be the default when the content fits several? Today the AI chooses; a study of what users switch to would answer it.
