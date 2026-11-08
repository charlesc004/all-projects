<?php
/** Initial business content step. @package Avenor */
defined( 'ABSPATH' ) || exit;

$avenor_articles = array(
	array( 'A digital roadmap should make decisions easier', 'Digital Strategy', 'A roadmap is useful when it explains why priorities are ordered, who owns them, and what evidence might change the plan.', 'Begin with the decisions your team needs to make. Interview people closest to customers and operations. Record the assumptions behind proposed investments.', 'Group opportunities by customer need. Give each initiative an owner, a review date, and an observable outcome. Revisit the sequence when evidence changes.' ),
	array( 'The quiet value of a maintainable website', 'Web Development', 'The quality of a website becomes clear when someone else needs to change it.', 'Good content models describe the business in familiar language. Reusable components keep presentation consistent while making editorial work straightforward.', 'Choose dependable tools. Document important decisions, establish a realistic performance budget, and test the tasks editors actually perform.' ),
	array( 'Before you automate, understand the handoff', 'Business Automation', 'Useful automation begins with a conversation about how work moves between people.', 'Map the workflow without judging it. Follow one real item from start to finish and note where information is copied, checked, delayed, or lost.', 'Start with a low-risk step and a clear owner. Keep human review for consequential decisions. Make failures visible and document recovery before expanding.' ),
	array( 'Clear interfaces start with better questions', 'User Experience', 'An interface earns its simplicity through the work before the first screen is drawn.', 'Ask people about the last time they completed a task. Specific examples reveal constraints that hypothetical preferences rarely expose.', 'Prototype the hardest decision first. Observe where people pause. Use evidence to refine language, hierarchy, and feedback before adding visual polish.' ),
	array( 'Confidence is part of the checkout experience', 'E-Commerce', 'People need to understand what they are buying, what it will cost, and what happens after they pay.', 'Make products easy to compare. Explain delivery, returns, and extra costs before the final step. Uncertainty creates unnecessary friction.', 'Test checkout on a small screen and a slow connection. Preserve information after errors and make the next action clear. Confidence comes from useful feedback.' ),
	array( 'Choosing technology with a longer view', 'Technical Innovation', 'A platform decision should consider the team that owns it long after launch.', 'Record operational constraints before comparing features. Consider publishing, integration, accessibility, updates, and the skills available.', 'Evaluate a working slice. Include learning, maintenance, and migration costs. A decision record should explain the choice and conditions for revisiting it.' ),
);
foreach ( $avenor_articles as $avenor_index => $avenor_article ) {
	[ $avenor_title, $avenor_category, $avenor_excerpt, $avenor_first, $avenor_second ] = $avenor_article;
	$avenor_content = avenor_seed_p( $avenor_excerpt ) . avenor_seed_h( 'Start with understanding' ) . avenor_seed_p( $avenor_first ) . avenor_seed_h( 'Make it practical' ) . avenor_seed_p( $avenor_second ) . avenor_seed_h( 'A question to take with you' ) . avenor_seed_p( 'What could your team make clearer this week, and what evidence would help you decide whether it made a difference?' );
	$avenor_id      = avenor_seed_record( 'post', sanitize_title( $avenor_title ), $avenor_title, $avenor_content, $avenor_excerpt );
	$avenor_term    = term_exists( $avenor_category, 'category' );
	if ( ! $avenor_term ) {
		$avenor_term = wp_insert_term( $avenor_category, 'category' );
	}
	$avenor_categories = wp_get_post_categories( $avenor_id );
	if ( ! is_wp_error( $avenor_term ) && ( ! $avenor_categories || array( (int) get_option( 'default_category' ) ) === $avenor_categories ) ) {
		wp_set_post_categories( $avenor_id, array( (int) ( is_array( $avenor_term ) ? $avenor_term['term_id'] : $avenor_term ) ) );
	}
	avenor_seed_image( $avenor_id, $avenor_cases[ $avenor_index ][3], 'Editorial illustration for ' . strtolower( $avenor_title ) );
}
