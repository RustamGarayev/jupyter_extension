import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette, MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

interface APODResponse {
    copyright: string;
    date: string;
    explanation: string;
    media_type: 'video' | 'image';
    title: string;
    url: string;
};

class APODWidget extends Widget {
    constructor() {
        super();
        
        this.addClass('my-apodWidget');
        
        // Add an image element to the content
        this.img = document.createElement('img');
        this.node.appendChild(this.img);
        
        // Add a summary element to the panel
        this.summary = document.createElement('p');
        this.node.appendChild(this.summary);
    }
    
    // The image element associated with the widget.
    readonly img: HTMLImageElement;
    
    // The summary text element associated with the widget.
    readonly summary: HTMLParagraphElement;
    
    /**
    * Handle update requests for the widget.
    */
    async onUpdateRequest(msg: Message): Promise<void> {
        const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${this.randomDate()}`);

        if (!response.ok) {
            const data = await response.json();
            if (data.error) {
                this.summary.innerText = data.error.message;
            } else {
                this.summary.innerText = response.statusText;
            }
            return;
        }

        const data = await response.json() as APODResponse;

        if (data.media_type === 'image') {
            // Populate the image
            this.img.src = data.url;
            this.img.title = data.title;
            this.summary.innerText = data.title;
            if (data.copyright) {
                this.summary.innerText += ` (Copyright ${data.copyright})`;
            }
        } else {
            this.summary.innerText = 'Random APOD fetched was not an image.';
        }
    }
    
    // Get a random date string in the format of YYYY-MM-DD format for API request
    randomDate(): string {
        const start = new Date(2010, 1, 1);
        const end = new Date();
        const randomDate = new Date(start.getTime() + Math.random()*(end.getTime() - start.getTime()));

        return randomDate.toISOString().slice(0, 10);
    }   
};

/**
* Activate the APOD widget extension.
*/
function activate(app: JupyterFrontEnd, palette: ICommandPalette, restorer: ILayoutRestorer) {
    console.log('JupyterLab extension jupyterlab_apod is activated!');
    
    // Declare a widget variable
    let widget: MainAreaWidget<APODWidget>;

    // Add an application command
    const command: string = 'apod:open';
    app.commands.addCommand(command, {
        label: 'Random Astronomy Picture',
        execute: () => {
            if (!widget || widget.isDisposed){
                // Create a new widget if one does not exist
                // or if the previous one was disposed after closing the panel
                const content = new APODWidget();
                widget = new MainAreaWidget({content});
                widget.id = 'apod-jupyterlab';
                widget.title.label = 'Astronomy Picture';
                widget.title.closable = true;
            }
            
            if (!tracker.has(widget)) {
                // Track the state of the widget for later restoration
                tracker.add(widget);
            }

            if (!widget.isAttached) {
                // Attach the widget to the main work area if it's not there
                app.shell.add(widget, 'main');
            }
            
            // Refresh the picture in the widget
            widget.content.update();
            
            // Activate the widget
            app.shell.activateById(widget.id);
        }
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'Tutorial' });
    
    // Add the command to the palette.
    let tracker = new WidgetTracker<MainAreaWidget<APODWidget>>({
        namespace: 'apod'
    })
    
    // Track and restore the widget state
    restorer.restore(tracker, {
        command, 
        name: () => 'apod'
    });
}


/**
 * Initialization data for the jupyterlab_apod extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'jupyterlab_apod',
    autoStart: true,
    requires: [ICommandPalette, ILayoutRestorer],
    activate: activate
};

export default plugin;
