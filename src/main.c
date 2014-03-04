#include <pebble.h>

Window* window;
TextLayer *text_layer;

// Key values for AppMessage Dictionary
enum {
	STATUS_KEY = 0,	
	MESSAGE_KEY = 1
};

#define UP 65
#define CEN 13
#define DOWN 68
#define STRT 4
#define DEATH 100
  
// Write message to buffer & send
void send_message(int d)
{
	DictionaryIterator *iter;
	
	app_message_outbox_begin(&iter);
	dict_write_uint8(iter, STATUS_KEY, 0x1);
     dict_write_uint8(iter, MESSAGE_KEY, d);

     dict_write_end(iter);
     app_message_outbox_send();
}

// Called when a message is received from PebbleKitJS
static void in_received_handler(DictionaryIterator *received, void *context) 
{
	Tuple *tuple;
	
	tuple = dict_find(received, MESSAGE_KEY);
	if(tuple) 
     {
          switch((int)tuple->value->uint32)
          {
               case UP: text_layer_set_text(text_layer, "Left!"); break;
               case CEN: text_layer_set_text(text_layer, "Restart!"); break;
               case DOWN: text_layer_set_text(text_layer, "Right!"); break;
               case STRT: text_layer_set_text(text_layer, "Press UP to go left!\nPress DOWN to go right!\nPress SELECT to reset!"); break;
          }
	}
}

// Called when an incoming message from PebbleKitJS is dropped
static void in_dropped_handler(AppMessageResult reason, void *context) 
{
 
}

// Called when PebbleKitJS does not acknowledge receipt of a message
static void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) 
{
     
}

void up_click_handler(ClickRecognizerRef recognizer, void *context) 
{
      send_message(UP);

	//Create an array of ON-OFF-ON etc durations in milliseconds
     /*
	uint32_t segments[] = {100, 200, 500};

	//Create a VibePattern structure with the segments and length of the pattern as fields
	VibePattern pattern = {
		.durations = segments,
		.num_segments = ARRAY_LENGTH(segments),
	};

	//Trigger the custom pattern to be executed
	vibes_enqueue_custom_pattern(pattern);
     */
}

void down_click_handler(ClickRecognizerRef recognizer, void *context) 
{
     send_message(DOWN);
}

void select_click_handler(ClickRecognizerRef recognizer, void *context)
{
     send_message(CEN);
}

void click_config_provider(void *context) 
{
	window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
	window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
	window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
}

/* Load all Window sub-elements */
void window_load(Window *window)
{
	text_layer = text_layer_create(GRect(0, 0, 144, 168));
	text_layer_set_background_color(text_layer, GColorClear);
	text_layer_set_text_color(text_layer, GColorBlack);

	layer_add_child(window_get_root_layer(window), (Layer*) text_layer);
}

/* Un-load all Window sub-elements */
void window_unload(Window *window)
{
	text_layer_destroy(text_layer);
}

/* Initialize the main app elements */
void init()
{
	window = window_create();
	WindowHandlers handlers = 
     {
		.load     = window_load,
		.unload   = window_unload
	};
	window_set_window_handlers(window, (WindowHandlers) handlers);
	window_set_click_config_provider(window, click_config_provider);
	window_stack_push(window, true);
 
	// Register AppMessage handlers
	app_message_register_inbox_received(in_received_handler); 
	app_message_register_inbox_dropped(in_dropped_handler); 
	app_message_register_outbox_failed(out_failed_handler);
		
	app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
	
	send_message(STRT);
}

/* De-initialize the main app elements */
void deinit()
{
	window_destroy(window);
}

/* Main app lifecycle */
int main(void)
{
	init();
	app_event_loop();
	deinit();
}