"use client";

import { useEffect } from "react";
import ApiKeyInjector from "./ApiKeyInjector";

export default function PageEnhancer() {
  useEffect(() => {
    // Enhance code tabs
    const handleTabChange = (e: Event) => {
      const select = e.target as HTMLSelectElement;
      if (!select.hasAttribute("data-code-tabs-select")) return;

      const container = select.closest(".code-tabs-container");
      if (!container) return;

      const tabIndex = select.value;
      const syncGroup = select.getAttribute("data-sync");
      const selectedTabName = select.options[select.selectedIndex]?.text;

      // Update active panel in current container
      container.querySelectorAll(".code-tab-panel").forEach((panel) => {
        panel.classList.remove("active");
      });
      const activePanel = container.querySelector(
        `.code-tab-panel[data-panel="${tabIndex}"]`
      );
      if (activePanel) {
        activePanel.classList.add("active");
      }

      // Sync across other code tab containers with the same sync group
      if (syncGroup && selectedTabName) {
        document
          .querySelectorAll(`.code-tabs-select[data-sync="${syncGroup}"]`)
          .forEach((otherSelect) => {
            if (otherSelect === select) return;

            const htmlSelect = otherSelect as HTMLSelectElement;
            for (let i = 0; i < htmlSelect.options.length; i++) {
              if (htmlSelect.options[i].text === selectedTabName) {
                htmlSelect.value = i.toString();

                const otherContainer = htmlSelect.closest(".code-tabs-container");
                if (otherContainer) {
                  otherContainer
                    .querySelectorAll(".code-tab-panel")
                    .forEach((panel) => {
                      panel.classList.remove("active");
                    });
                  const otherActivePanel = otherContainer.querySelector(
                    `.code-tab-panel[data-panel="${i}"]`
                  );
                  if (otherActivePanel) {
                    otherActivePanel.classList.add("active");
                  }
                }
                break;
              }
            }
          });
      }
    };

    // Enhance footnotes
    const footnoteRefs = document.querySelectorAll(".footnote-ref");
    let hoverTimeout: NodeJS.Timeout | null = null;
    let currentSidenote: HTMLElement | null = null;

    footnoteRefs.forEach((ref) => {
      ref.addEventListener("mouseenter", (e) => {
        const target = e.target as HTMLElement;

        // Clear any existing timeout
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }

        // Add delay before showing sidenote
        hoverTimeout = setTimeout(() => {
          const href = target.getAttribute("href");
          if (!href) return;

          const footnoteId = href.replace("#user-content-fn-", "");
          const footnoteDef = document.querySelector(
            `.footnote-definition[data-footnote-id="${footnoteId}"]`
          );

          if (!footnoteDef || window.innerWidth < 1280) return;

          // Remove any existing sidenote
          if (currentSidenote) {
            currentSidenote.remove();
            currentSidenote = null;
          }

          const rect = target.getBoundingClientRect();
          const sidenote = document.createElement("div");
          sidenote.className = "sidenote sidenote-active";

          // Clone the content but remove the back-reference link
          const content = footnoteDef.cloneNode(true) as HTMLElement;
          const backRef = content.querySelector('a[href^="#user-content-fnref-"]');
          if (backRef) {
            backRef.remove();
          }
          sidenote.innerHTML = content.innerHTML;

          sidenote.style.left = `${rect.right + 16}px`;
          sidenote.style.top = `${rect.top}px`;

          document.body.appendChild(sidenote);
          currentSidenote = sidenote;
          target.setAttribute("data-sidenote-active", "true");

          // Keep sidenote open when hovering over it
          sidenote.addEventListener("mouseenter", () => {
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
            }
          });

          sidenote.addEventListener("mouseleave", () => {
            if (currentSidenote) {
              currentSidenote.remove();
              currentSidenote = null;
            }
            target.removeAttribute("data-sidenote-active");
          });
        }, 150); // 150ms delay before showing
      });

      ref.addEventListener("mouseleave", (e) => {
        const target = e.target as HTMLElement;

        // Clear the timeout if mouse leaves before delay completes
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }

        // Delay removing sidenote to allow moving mouse to it
        setTimeout(() => {
          if (!target.getAttribute("data-sidenote-active")) return;

          const sidenote = document.querySelector(".sidenote:hover");
          if (!sidenote && currentSidenote) {
            currentSidenote.remove();
            currentSidenote = null;
            target.removeAttribute("data-sidenote-active");
          }
        }, 100);
      });
    });

    document.addEventListener("change", handleTabChange);

    return () => {
      document.removeEventListener("change", handleTabChange);
    };
  }, []);

  return <ApiKeyInjector />;
}
