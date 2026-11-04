import { RULES } from "./live";

/**
 * Text for the About & Rules page. Replace the placeholders with your
 * actual league and auction rules.
 */
export const about = {
  title: "About MPL",
  paragraphs: [
    "The Management Premier League (MPL) is the annual inter-batch sports festival for MBA students. Three tournaments – Cricket, Volleyball and Football – are played between teams that are built through a live player auction.",
    "Every registered student is listed with a base price. Team captains use their purse to bid for the players they want, and the squads you see on this site are the result.",
  ],
};

export const leagueRules: string[] = [
  "Only currently enrolled MBA students can register as players.",
  "A player can register for more than one sport but can be bought by only one team per sport.",
  "Each sport has four teams. Every team is led by a captain nominated by the organising committee.",
  "Matches follow the standard rules of the sport unless the committee announces a change before the tournament.",
  "The decision of the umpires / referees and the organising committee is final.",
  "Fair play is mandatory. Misconduct can lead to a player or team being disqualified.",
];

export const footballRules: string[] = [
  "The four teams play a league: each team plays the other three once, six matches in all.",
  `Each match lasts ${RULES.football.halfMinutes * 2} minutes: two halves of ${RULES.football.halfMinutes} minutes.`,
  `A win earns ${RULES.football.pointsForWin} points, a draw ${RULES.football.pointsForDraw} point and a loss 0 points.`,
  "Teams are ranked by points, then goal difference, then goals scored, then the result of their match against each other.",
  `The top ${RULES.football.finalists} teams go straight to the final. There are no semi-finals.`,
  "The Points Table page updates when each match ends, and the final's teams appear once the league is over.",
];

const { league, final } = RULES.volleyball;

export const volleyballRules: string[] = [
  "The four teams play a league: each team plays the other three once, six matches in all.",
  `Every league match is best of ${league.bestOf} sets: first to ${league.setPoints} points in each set, and a team must win a set by ${league.winBy}. The first team to win ${Math.floor(league.bestOf / 2) + 1} sets wins the match.`,
  `A win earns ${RULES.volleyball.pointsForWin} points and a loss 0 points.`,
  "Teams are ranked by points, then set difference, then point difference, then points scored, then the result of their match against each other.",
  `The top ${RULES.volleyball.finalists} teams go straight to the final. There are no semi-finals.`,
  `The final is also best of ${final.bestOf} sets, but with ${final.setPoints} points in each set.`,
];

export const auctionRules: string[] = [
  "Every player starts at a fixed base price shown on their profile.",
  "Each team has a fixed purse for its sport. The remaining purse is always visible on the Teams page.",
  "A team can never bid more than its remaining purse.",
  "The opening bid is the base price. After that each bid must be higher than the last; the auctioneer raises it in steps of ₹1 lakh or takes any higher amount a team calls out.",
  "The highest bid when the auctioneer closes bidding wins the player (status: Sold).",
  "A player who receives no bid is marked Unsold and may be brought back in the final round.",
  "Once a player is sold, the sale cannot be reversed except by the organising committee.",
];

export const contactNote =
  "Questions about registration, player profiles or the auction? Reach out to the organising committee.";
