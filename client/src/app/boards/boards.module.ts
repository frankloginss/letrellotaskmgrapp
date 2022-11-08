import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AuthGuardService } from "../auth/services/authGuard.service";
import { InlineFormModule } from "../shared/modules/inlineForm/inlineForm.module";
import { TopbarModule } from "../shared/modules/topbar/topbar.module";
import { BoardsService } from "../shared/services/boards.service";
import { BoardComponent } from "./components/boards/boards.component";

const routes: Routes = [
    {
        path: 'boards',
        component: BoardComponent,
        canActivate: [AuthGuardService]
    }
]

@NgModule({
    imports: [CommonModule, RouterModule.forChild(routes), InlineFormModule, TopbarModule],
    declarations: [BoardComponent],
    providers: [BoardsService]
})
export class BoardsModule {}