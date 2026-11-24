# Architecture decision records

| ADR | Decision | Where |
| --- | --- | --- |
| [0001](0001-private-and-public-repositories.md) | One private source repository (`dsys_xiding01`), one generated public copy (`dsys_xiding02`) | both |
| 0002 | The member app, the service and the media server live in a separate repository | private repository only |
| [0003](0003-one-review-artifact-per-repository.md) | `dsys_xiding01` private, `dsys_xiding02` only the non-sensitive copy; one review artifact holding all assets for each | both |

The design system's own open decisions (brand teal, VI palette, …) are in `design-system/decisions.md`.
