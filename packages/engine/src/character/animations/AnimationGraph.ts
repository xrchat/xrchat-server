import { AnimationComponent } from "../components/AnimationComponent";
import { CharacterComponent } from "../components/CharacterComponent";
import { AnimationState } from "./AnimationState";
import { calculateMovement } from "./MovingAnimations";
import { CharacterStates, MovementType } from "./Util";

/** Base Class which hold the animation graph for entity. Animation graph will resides in Animation Component. */
export class AnimationGraph {
    /** All the possible states of this graph */
    states: { [key: string]: AnimationState } = {};

    /** Default state which will be rendered when there is not animation is running.
     * If the sum of weights of all running animations are less then 1 then the weight of this animation will be, 1 - (sum of weights of all running animations) */
    defaultState: AnimationState;

    /** Precision value */
    EPSILON = 0.001;

    /** Indicates whether the transition from one state to another is paused or not */
    isTransitionPaused: boolean;

    /**
     * Pauses the transition for given miliseconds
     * @param miliseconds For which transition is pased
     */
    pauseTransitionFor = (miliseconds: number): void => {
        this.isTransitionPaused = true;
        setTimeout(() => {
            this.isTransitionPaused = false;
        }, miliseconds);
    }

    /**
     * Validates the transition. If the current state has no next states then transition is valid
     * @param currentState current state of the animiation
     * @param newState New state to which transition is going to take place
     * @returns Whether the transition is valid or not
     */
    validateTransition = (currentState: AnimationState, newState: AnimationState): boolean => {
        if (currentState.nextStates.length === 0) return true;

        for (let i = 0; i < currentState.nextStates.length; i++) {
            if (newState.constructor.name === currentState.nextStates[i].name) return true;
        }

        return false;
    }

    /**
     * Transit the state from one state to another
     * @param actor Character compoenent which holds character details
     * @param animationComponent Animation component which holds animation details
     * @param newState New state to which transition will happen
     * @param movement Movenent of the actor happed in this frame
     */
    transitionState = (actor: CharacterComponent, animationComponent: AnimationComponent, newState: string, movement?: MovementType): void => {
        // If transition is paused the return
        if (this.isTransitionPaused) return;

        // Validat the transition
        const nextState = this.states[newState];
        if (!this.validateTransition(animationComponent.currentState, nextState)) {
            return;
        }

		// Immediately unmount previous state if any
        if (newState !== animationComponent.currentState.name) {
			if (animationComponent.prevState) {
				animationComponent.prevState.unmount(true);
			}

            // Never unmount default state
            if (animationComponent.currentState.name !== this.defaultState.name) {

                // Set current state as previous state
                animationComponent.prevState = animationComponent.currentState;
                animationComponent.prevState.timeElapsedAfterUnmount = 0;
            }

            // Set new state
			animationComponent.currentState = this.states[newState];
		}

		// Mount new state
        animationComponent.currentState.mount(actor, movement);

        // Add event to auto transit to new state when the animatin of current state finishes
        if (animationComponent.currentState.autoTransitionTo) {
            const transitionEvent = () => {
                this.isTransitionPaused = false;
                this.transitionState(actor, animationComponent, animationComponent.currentState.autoTransitionTo, movement);
                actor.mixer.removeEventListener('finished', transitionEvent);
            }
            actor.mixer.addEventListener('finished', transitionEvent);
        }

        // Pause transition if current state requires
        if (animationComponent.currentState.pauseTransitionDuration) {
            this.pauseTransitionFor(animationComponent.currentState.pauseTransitionDuration);
        }
    }

    /**
     * An animation state check for state transition, previous state unmount and running default state for idle weight for the velocity based animations.
     * This method will not run the animation it will just handle the transition, weight change and unmounting of the animation.
     * Animations will be handled by Three js library's animation manager.
     * @param actor Character compoenent which holds character details
     * @param animationComponent Animation component which holds animation details
     * @param delta Time since last frame
     */
    render = (actor: CharacterComponent, animationComponent: AnimationComponent, delta: number): void => {
        // Calculate movement fo the actor for this frame
		const movement = calculateMovement(actor, delta, this.EPSILON);

        // Check whether the velocity of the player is changed or not since last frame
        const isChanged = !animationComponent.prevVelocity.equals(movement.velocity);

        // If velocity is not changed then no updated and transition will happen
        if (isChanged) {
            let newState = '';
            if (movement.velocity.length() > this.EPSILON * 3) {
                newState = actor.isWalking ? CharacterStates.WALK : CharacterStates.RUN;
            } else {
                newState = CharacterStates.IDLE
            }

            // If new state is different than current state then transit other wise update the current state
            if (animationComponent.currentState.name !== newState) {
                animationComponent.animationGraph.transitionState(actor, animationComponent, newState, movement)
            } else {
                animationComponent.currentState.update(movement);
            }

            // Set velocity as prev velocity
            animationComponent.prevVelocity.copy(movement.velocity);
        }

        let prevStateWeight = 0;

        // If prev state exists then unmount it gradually
        if (animationComponent.prevState) {
            animationComponent.prevState.timeElapsedAfterUnmount += delta;
            animationComponent.prevState.unmount();

            prevStateWeight = animationComponent.prevState.getTotalWeightsOfAnimations();
            if (animationComponent.prevState.name !== this.defaultState.name) {

                // If there is no weight in the prevState animations then remove it.
                if (prevStateWeight <= this.EPSILON) {
                    animationComponent.prevState = null;
                }
            }
        }

        // Render idle weight with default animation to prevent T pose being rendered
        if (animationComponent.currentState.name !== this.defaultState.name) {
            const idleWeight = 1 - (prevStateWeight + animationComponent.currentState.getTotalWeightsOfAnimations());
            this.defaultState.animations[0].weight = idleWeight;
            this.defaultState.update(movement);
        }
    }
}