import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp(functions.config().firebase);
const db = admin.database();

const getWinner = (home: number, visitor: number): string => {
    let winner = "";
    if (home > visitor) {
        winner = "home";
    } else {
        if (home < visitor) {
            winner = "visitor";
        } else {
            winner = "tied";
        }
    }
    return winner;
};

const getScore = (home: number, visitor: number, homePrediction: number, visitorPrediction: number): number => {
    let points = 0;
    if (home >= 0 && homePrediction != null && visitorPrediction != null) {
        if ((home == homePrediction) && (visitor == visitorPrediction)) {
            points = 15;
        } else {
            if (getWinner(home, visitor) == getWinner(homePrediction, visitorPrediction)) {
                points = 10 - Math.abs(homePrediction - home) - Math.abs(visitorPrediction - visitor);
                if (points < 0) {
                    points = 0;
                }
            }
        }
    }
    return points;
};

export const updatePredictionPoints = functions.database.ref("matches/{matchId}")
    .onWrite((change, context) => {
        const matchId = context.params.matchId;
        const match = change.after.val();
        // Get users
        return db.ref().child('users').once('value').then((snapshot) => {
            // Update user prediction points
            snapshot.forEach((childSnapshot) => {
                db.ref().child(`predictions/${childSnapshot.key}/${matchId}`).once('value').then((predSnapshot) => {
                    const pred = predSnapshot.val();
                    const points = getScore(match.homeScore, match.awayScore, pred.homePrediction, pred.awayPrediction);
                    db.ref(`predictions/${childSnapshot.key}/${matchId}/points`).set(points);
                });
            });
        });
    });

export const updateUserScore = functions.database.ref("predictions/{userId}/{matchId}/points")
    .onWrite((change, context) => {
        const userId = context.params.userId;
        const beforePoints = change.before.val();
        const afterPoints = change.after.val();
        db.ref().child(`users/${userId}/score`).once('value').then((scoreSnapshot) => {
            if (scoreSnapshot.exists()) {
                const points = scoreSnapshot.val() - beforePoints + afterPoints;
                db.ref(`users/${userId}/score`).set(points);
            } else {
                db.ref(`users/${userId}/score`).set(afterPoints);
            }
        });
    });

