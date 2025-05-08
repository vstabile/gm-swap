import { Swap, SwapState } from "~/queries/swap";
import { LucideCheck } from "lucide-solid";

interface TimelineProps {
  swap: Swap;
  isNonceProvider: boolean;
}

export default function Timeline(props: TimelineProps) {
  // Define the states in order
  const states: SwapState[] = [
    "nonce-pending",
    "adaptor-pending",
    "given-pending",
    "completed",
  ];

  // Get the current state based on the swap data
  const getCurrentState = (): number => {
    if (props.swap.state === "completed") return 3; // Completed
    if (["given-pending", "taken-pending"].includes(props.swap.state)) return 2; // Publishing
    if (props.swap.state === "adaptor-pending") return 1; // Receive/Send Adaptor
    return 0; // Send/Receive Nonce
  };

  const currentState = getCurrentState();

  // Labels for each state
  const stateLabels = props.isNonceProvider
    ? ["Send Nonce", "Receive Adaptor", "Publishing", "Completed"]
    : ["Receive Nonce", "Send Adaptor", "Publishing", "Completed"];

  return (
    <div class="w-full px-2 py-5">
      <div class="relative h-10">
        {/* Base horizontal line (gray) */}
        <div class="absolute h-0.5 bg-gray-200 w-full top-1/2 -translate-y-1/2"></div>

        {/* Colored line segments */}
        <div
          class="absolute h-0.5 bg-primary top-1/2 -translate-y-1/2 left-0"
          style={{
            width:
              currentState === 0
                ? "0"
                : `${(currentState / (states.length - 1)) * 100}%`,
          }}
        ></div>

        {/* State points */}
        {states.map((state, index) => {
          const isPast = index <= currentState;
          const isActive = index === currentState;
          const isFirst = index === 0;
          const isLast = index === states.length - 1;
          const isLastState = index === states.length - 1;

          // Styles based on state
          let circleClass = "";
          if (isActive) {
            if (isLastState) {
              // Last state when active: primary background with white border
              circleClass = "bg-primary border-white";
            } else {
              // Other active states: white background with primary border
              circleClass = "bg-white border-primary";
            }
          } else if (isPast) {
            // Past states: primary background
            circleClass = "bg-primary border-white";
          } else {
            // Future states: white background with muted border
            circleClass = "bg-white border-gray-200";
          }

          const textClass = isPast ? "text-primary" : "text-muted-foreground";
          const sizeClass = isActive && isLastState ? "w-5 h-5" : "w-3 h-3";

          // Calculate position (0% for first, 100% for last, evenly spaced in between)
          const position = isFirst
            ? "0%"
            : isLast
              ? "100%"
              : `${(index / (states.length - 1)) * 100}%`;

          // Label position and alignment
          let labelStyles = {};
          if (isFirst) {
            // First state: label to the right of circle
            labelStyles = { left: "-5px", transform: "none" };
          } else if (isLast) {
            // Last state: label to the left of circle
            labelStyles = { right: "-5px", left: "auto", transform: "none" };
          } else {
            // Middle states: centered under/above circle
            labelStyles = { left: "50%", transform: "translateX(-50%)" };
          }

          return (
            <div
              class="absolute top-1/2 z-10"
              style={{
                left: position,
              }}
            >
              {/* Circle on the line */}
              <div
                class={`${circleClass} ${sizeClass} rounded-full border-2 absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center`}
              >
                {/* Show hourglass or check icon only for the active state */}
                {isActive && isLastState && (
                  <LucideCheck class="w-3 h-3 text-primary-foreground" />
                )}
              </div>

              {/* Labels - special handling for first and last */}
              {index % 2 === 0 || isFirst ? (
                <div
                  class={`absolute -top-7 whitespace-nowrap text-xs font-medium ${textClass} ${isFirst ? "text-left" : isLast ? "text-right" : "text-center"}`}
                  style={labelStyles}
                >
                  {stateLabels[index]}
                </div>
              ) : (
                <div
                  class={`absolute top-3 whitespace-nowrap text-xs font-medium ${textClass} text-center`}
                  style={labelStyles}
                >
                  {stateLabels[index]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
